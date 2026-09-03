/**
 * Offline enrichment pipeline (spec §7). Run once per dataset change:
 *
 *   npm run enrich
 *
 * Requires OPENROUTER_API_KEY (in .env.local or the environment).
 * Produces BOTH committed dataset files:
 *
 *   data/dataset-pre-enrichment.json   — raw fields, embeddings from the
 *                                        submitter's original text, duplicate
 *                                        candidates
 *   data/dataset-post-enrichment.json  — solution summaries + tags generated
 *                                        and written back onto linked ideas,
 *                                        embeddings recomputed over the
 *                                        enriched text, duplicate candidates
 *                                        recomputed
 *
 * If the OpenRouter embeddings endpoint fails, this script stops. There is
 * deliberately no fallback to another provider — the single-key design is a
 * stated constraint, and any fallback decision belongs to a human.
 */
import fs from "node:fs";
import path from "node:path";
import { chatComplete, embedTexts, embeddingModel, getApiKey } from "../lib/openrouter";
import { TAG_TAXONOMY } from "../lib/tag-taxonomy";

/**
 * Load .env.local / .env manually — tsx doesn't do it for us outside Next.js.
 * Handles UTF-8 and UTF-16 files (PowerShell's default encoding is UTF-16).
 * Existing environment variables always win.
 */
function readEnvFileText(file: string): string {
  const buf = fs.readFileSync(file);
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.toString("utf16le");
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.from(buf);
    swapped.swap16();
    return swapped.toString("utf16le");
  }
  return buf.toString("utf8").replace(/^\uFEFF/, "");
}

function loadEnvLocal(): void {
  for (const name of [".env.local", ".env"]) {
    const file = path.join(process.cwd(), name);
    if (!fs.existsSync(file)) continue;
    for (const line of readEnvFileText(file).split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let value = m[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(m[1] in process.env)) process.env[m[1]] = value;
    }
  }
}
loadEnvLocal();


// Duplicate detection thresholds (cosine similarity), tuned against the
// planted clusters — see scripts/verify-duplicates.ts. The pre- and
// post-enrichment corpora are embedded from different text, so their
// similarity distributions differ; each dataset records its own threshold.
// Re-tuned 2026-09-02 after regenerating summaries/tags against the fixed
// taxonomy (Addendum A §1.3): pre 0.65 unchanged, post moved 0.70 → 0.7118
// (the regenerated post text compressed the gap between the planted
// sol-0011~sol-0020 pair at 0.7120 and the highest non-planted pair,
// idea-0005~idea-0006, at 0.7116). Override with DUP_THRESHOLD (both) or
// DUP_THRESHOLD_PRE / DUP_THRESHOLD_POST.
// KNOWN FRAGILITY (docs/BACKLOG.md): the post-enrichment margin between the
// planted sol-0011~sol-0020 pair and the nearest non-planted pair is only
// ~0.0002-0.0004. Re-run npm run verify-duplicates after ANY re-enrichment —
// never assume this threshold still holds once summaries/embeddings regenerate.
const DUP_THRESHOLD_PRE = Number(process.env.DUP_THRESHOLD_PRE ?? process.env.DUP_THRESHOLD ?? 0.65);
const DUP_THRESHOLD_POST = Number(process.env.DUP_THRESHOLD_POST ?? process.env.DUP_THRESHOLD ?? 0.7118);
const TOP_CANDIDATES = 3;
const EMBED_ROUND = 5; // decimal places kept for stored embeddings

const ALLOWED_TAGS = TAG_TAXONOMY;

/**
 * Cache version — bumped when the enrichment prompt changes meaningfully, so
 * stale cached results are not reused. v2: tags now come from the fixed
 * taxonomy above instead of being generated freeform.
 */
const CACHE_VERSION = "v2-fixed-taxonomy";

interface SeedIdea {
  key: string;
  id: string;
  org: string;
  service: string;
  title: string;
  description: string;
  notes: string;
  submitted_by: string;
  submitted_by_manager: string;
  submitted_date: string;
  status: string;
  linked_solution_id: string | null;
  duplicate_of: string | null;
  duplicate_candidates: Array<{ id: string; score: number }>;
  _cluster: string | null;
  _vague: boolean;
}

interface SeedSolution {
  key: string;
  id: string;
  resolves_idea_id: string | null;
  name: string;
  artifact_type: string;
  technology_type: string;
  raw_description: string;
  ai_generated_summary: string | null;
  category_tags: string[];
  artifact_link: string;
  solution_owner: string;
  built_by: string;
  date_built: string;
  date_last_reviewed: string | null;
  duplicate_of: string | null;
  duplicate_candidates: Array<{ id: string; score: number }>;
  _cluster: string | null;
}

// ---------------------------------------------------------------------------
// Similarity + duplicate detection (shared logic with the app's retrieval)
// ---------------------------------------------------------------------------

function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function roundTo(value: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(value * f) / f;
}

interface WithCandidates {
  id: string;
  embedding: number[];
  duplicate_candidates: Array<{ id: string; score: number }>;
}

/**
 * Cosine similarity clustering over the embeddings already computed for
 * search (spec §9 — no separate model or pipeline). Per record, keep the top
 * same-type neighbors at or above the threshold. Nothing is merged
 * automatically; these are review candidates.
 */
function computeDuplicateCandidates<T extends WithCandidates>(
  records: T[],
  threshold: number
): void {
  for (const record of records) {
    record.duplicate_candidates = [];
  }
  for (let i = 0; i < records.length; i++) {
    const scored: Array<{ id: string; score: number }> = [];
    for (let j = 0; j < records.length; j++) {
      if (i === j) continue;
      const sim = cosine(records[i].embedding, records[j].embedding);
      if (sim >= threshold) scored.push({ id: records[j].id, score: roundTo(sim, 4) });
    }
    scored.sort((a, b) => b.score - a.score);
    records[i].duplicate_candidates = scored.slice(0, TOP_CANDIDATES);
  }
}

// ---------------------------------------------------------------------------
// Embedding text composition — the mechanism behind the enrichment demo.
// Pre: the submitter's original (often vague) wording only.
// Post: original wording plus the solution-side language written back from
// the built artifact, so the idea becomes findable in solution terms.
// ---------------------------------------------------------------------------

function ideaEmbedText(idea: {
  title: string;
  description: string;
  notes: string;
  solution_summary: string | null;
  solution_tags: string[];
}, variant: "pre" | "post"): string {
  const base = `${idea.title}\n${idea.description}\n${idea.notes}`.trim();
  if (variant === "pre") return base;
  const parts = [base];
  if (idea.solution_summary) parts.push(`Built solution: ${idea.solution_summary}`);
  if (idea.solution_tags.length) parts.push(`Tags: ${idea.solution_tags.join(", ")}`);
  return parts.join("\n");
}

function solutionEmbedText(sol: {
  name: string;
  raw_description: string;
  ai_generated_summary: string | null;
  category_tags: string[];
}, variant: "pre" | "post"): string {
  if (variant === "pre") return `${sol.name}\n${sol.raw_description}`.trim();
  const parts = [sol.name];
  if (sol.ai_generated_summary) parts.push(sol.ai_generated_summary);
  if (sol.category_tags.length) parts.push(`Tags: ${sol.category_tags.join(", ")}`);
  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// LLM enrichment of solutions (cached so re-runs don't re-bill)
// ---------------------------------------------------------------------------

const CACHE_DIR = path.join(process.cwd(), ".enrich-cache");

function cachePath(key: string): string {
  return path.join(CACHE_DIR, `${key}.${CACHE_VERSION}.json`);
}

function readCache(key: string): { summary: string; tags: string[] } | null {
  try {
    const raw = fs.readFileSync(cachePath(key), "utf8");
    return JSON.parse(raw) as { summary: string; tags: string[] };
  } catch {
    return null;
  }
}

function writeCache(key: string, value: { summary: string; tags: string[] }): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cachePath(key), JSON.stringify(value, null, 2));
}

function parseJsonLoose(text: string): { summary?: unknown; tags?: unknown } {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`No JSON object in LLM output: ${text.slice(0, 120)}`);
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function enrichSolution(
  sol: SeedSolution,
  idea: SeedIdea | undefined
): Promise<{ summary: string; tags: string[] }> {
  const cached = readCache(sol.key);
  if (cached) return cached;

  const messages = [
    {
      role: "system" as const,
      content:
        "You catalog built solutions in an internal improvement-ideas catalog. Given what a citizen developer wrote when saving their artifact, produce: (1) a factual 2-3 sentence summary of what the solution does, what problem it solves, and how it is used — written in plain business language someone searching the catalog might use; (2) 3-5 tags describing the capability and domain, chosen ONLY from this fixed taxonomy: " +
          TAG_TAXONOMY.join(", ") +
          ". Never invent a tag outside that list. Respond with JSON only: {\"summary\": string, \"tags\": string[]}.",
    },
    {
      role: "user" as const,
      content: [
        `Artifact name: ${sol.name}`,
        `Artifact type: ${sol.artifact_type}`,
        idea ? `It resolves this idea: "${idea.title}" — ${idea.description}` : "No linked idea on file.",
        `What the builder wrote when saving it: ${sol.raw_description}`,
      ].join("\n\n"),
    },
  ];

  const raw = await chatComplete(messages, { maxTokens: 400, temperature: 0.2 });
  const parsed = parseJsonLoose(raw);
  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  const allowed = new Set<string>(ALLOWED_TAGS);
  const droppedTags: string[] = [];
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => {
          if (allowed.has(t)) return true;
          droppedTags.push(t);
          return false;
        })
        .slice(0, 5)
    : [];
  if (droppedTags.length) {
    console.log(`(dropped off-taxonomy tags: ${droppedTags.join(", ")})`);
  }
  if (!summary || tags.length === 0) {
    throw new Error(`Enrichment for ${sol.key} came back incomplete: ${raw.slice(0, 200)}`);
  }
  const value = { summary, tags };
  writeCache(sol.key, value);
  return value;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!getApiKey()) {
    console.error(
      "STOP: OPENROUTER_API_KEY is not set. Put it in .env.local (never commit it) and re-run `npm run enrich`."
    );
    process.exit(1);
  }

  const dataDir = path.join(process.cwd(), "data");
  const seed = JSON.parse(fs.readFileSync(path.join(dataDir, "seed-records.json"), "utf8")) as {
    ideas: SeedIdea[];
    solutions: SeedSolution[];
  };
  const { ideas: seedIdeas, solutions: seedSolutions } = seed;
  console.log(`Loaded seed: ${seedIdeas.length} ideas, ${seedSolutions.length} solutions.`);

  // Step 1 — LLM enrichment of every solution.
  const ideaById = new Map(seedIdeas.map((i) => [i.id, i]));
  for (const sol of seedSolutions) {
    const idea = sol.resolves_idea_id ? ideaById.get(sol.resolves_idea_id) : undefined;
    process.stdout.write(`Enriching ${sol.key} (${sol.name})... `);
    const { summary, tags } = await enrichSolution(sol, idea);
    sol.ai_generated_summary = summary;
    sol.category_tags = tags;
    console.log("ok");
  }

  // Step 2 — write enrichment back onto linked ideas (post dataset only).
  const postIdeas = seedIdeas.map((idea) => ({
    ...idea,
    has_solution: false,
    solution_link: null as string | null,
    solution_summary: null as string | null,
    solution_tags: [] as string[],
    duplicate_candidates: [] as Array<{ id: string; score: number }>,
  }));
  const postIdeasById = new Map(postIdeas.map((i) => [i.id, i]));
  for (const sol of seedSolutions) {
    if (!sol.resolves_idea_id) continue;
    const idea = postIdeasById.get(sol.resolves_idea_id);
    if (!idea) continue;
    idea.has_solution = true;
    idea.solution_link = sol.artifact_link;
    idea.solution_summary = sol.ai_generated_summary;
    idea.solution_tags = sol.category_tags;
  }

  const preSolutions: SeedSolution[] = seedSolutions.map((s) => ({
    ...s,
    ai_generated_summary: null,
    category_tags: [] as string[],
  }));

  // Steps 3-5 — embeddings per variant, duplicate detection, emit.
  const buildVariant = async (
    variant: "pre" | "post",
    ideasIn: typeof postIdeas,
    solutionsIn: SeedSolution[],
    threshold: number
  ) => {
    const ideas = ideasIn.map((i) => ({ ...i, embedding: [] as number[] }));
    const solutions = solutionsIn.map((s) => ({ ...s, embedding: [] as number[] }));

    const ideaTexts = ideas.map((i) => ideaEmbedText(i, variant));
    const solTexts = solutions.map((s) => solutionEmbedText(s, variant));
    console.log(`Embedding ${variant}: ${ideaTexts.length} ideas + ${solTexts.length} solutions...`);
    const ideaVectors = await embedTexts(ideaTexts);
    const solVectors = await embedTexts(solTexts);
    ideas.forEach((r, i) => (r.embedding = ideaVectors[i].map((v) => roundTo(v, EMBED_ROUND))));
    solutions.forEach((r, i) => (r.embedding = solVectors[i].map((v) => roundTo(v, EMBED_ROUND))));

    computeDuplicateCandidates(ideas, threshold);
    computeDuplicateCandidates(solutions, threshold);

    // Strip script-only annotations before emitting.
    const cleanIdeas = ideas.map(({ key: _k, _cluster: _c, _vague: _v, ...rest }) => {
      void _k; void _c; void _v;
      return { ...rest, duplicate_candidates: rest.duplicate_candidates };
    });
    const cleanSolutions = solutions.map(({ key: _k, _cluster: _c, ...rest }) => {
      void _k; void _c;
      return { ...rest, duplicate_candidates: rest.duplicate_candidates };
    });

    const dataset = {
      variant,
      generated_at: new Date().toISOString(),
      embedding_model: embeddingModel(),
      duplicate_threshold: threshold,
      ideas: cleanIdeas,
      solutions: cleanSolutions,
    };
    const file = path.join(dataDir, variant === "pre" ? "dataset-pre-enrichment.json" : "dataset-post-enrichment.json");
    fs.writeFileSync(file, JSON.stringify(dataset, null, 2) + "\n");
    const flaggedIdeas = cleanIdeas.filter((i) => i.duplicate_candidates.length > 0).length;
    const flaggedSolutions = cleanSolutions.filter((s) => s.duplicate_candidates.length > 0).length;
    console.log(
      `Wrote ${path.basename(file)}: ${cleanIdeas.length} ideas (${flaggedIdeas} flagged), ${cleanSolutions.length} solutions (${flaggedSolutions} flagged).`
    );
  };

  await buildVariant(
    "pre",
    seedIdeas.map((i) => ({
      ...i,
      has_solution: false,
      solution_link: null,
      solution_summary: null,
      solution_tags: [] as string[],
      duplicate_candidates: [] as Array<{ id: string; score: number }>,
    })),
    preSolutions,
    DUP_THRESHOLD_PRE
  );
  await buildVariant("post", postIdeas, seedSolutions, DUP_THRESHOLD_POST);

  console.log("Done. Both datasets written. Next: npm run verify-duplicates");
}

main().catch((err) => {
  console.error("Enrichment failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});




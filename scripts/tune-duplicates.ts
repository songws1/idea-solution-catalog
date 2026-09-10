/**
 * Find the duplicate threshold instead of guessing it (v4.9).
 *
 * Why this exists. The committed post-enrichment threshold has been a hand-
 * picked number running on about 0.0004 of margin. Every regeneration moved the
 * distribution and broke it, and the fix was a human trying values until
 * `verify-duplicates` went green. That is a bad loop at the best of times, and
 * a terrible one across a chat boundary: whoever holds the API key runs enrich,
 * reports a failure, waits for a new number, re-runs.
 *
 * The number was never a judgement call. It is fully determined by the data.
 * The planted clusters are ground truth in data/seed-records.json, so a working
 * threshold is any value below what every planted cluster needs to stay
 * connected and above the strongest similarity between records that were not
 * planted together. This computes both bounds and takes the midpoint.
 *
 * The subtlety is the lower bound. Detection joins records transitively, so a
 * planted cluster does not need every pair to clear the threshold — it needs a
 * connected path. Constraining on the weakest PAIR (the obvious reading, and
 * this script's first version) demanded a threshold far below what detection
 * actually needs, and reported the pre-enrichment dataset as having no valid
 * threshold at all when in fact 0.65 has worked for months. The bound is the
 * cluster's bottleneck: the weakest edge in its maximum spanning tree.
 *
 * Sanity check on the method: run against the committed datasets it returns
 * 0.7118 for post, which is the hand-tuned value already in enrich.ts.
 *
 * Run AFTER `npm run enrich`, against the embeddings it wrote:
 *   npm run tune-duplicates
 *
 * It only reads. It prints the thresholds to set and, with --write, updates
 * the defaults in scripts/enrich.ts so the next `npm run enrich` reproduces
 * them. Detection itself still happens in enrich; nothing here re-flags
 * anything.
 */
import fs from "node:fs";
import path from "node:path";

interface Rec {
  id: string;
  embedding: number[];
  _cluster?: string | null;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

const dataDir = path.join(process.cwd(), "data");
const seed = JSON.parse(fs.readFileSync(path.join(dataDir, "seed-records.json"), "utf8"));

/** key → planted cluster name, from the ground truth the generator wrote. */
const plantedByKey = new Map<string, string>();
for (const kind of ["ideas", "solutions"] as const) {
  for (const r of seed[kind]) {
    if (r._cluster) plantedByKey.set(r.id, r._cluster);
  }
}

interface Result {
  variant: string;
  docType: string;
  /**
   * The weakest edge the cluster still needs, NOT the weakest pair in it.
   *
   * Detection joins records transitively (union-find), so a three-member
   * cluster A-B-C is caught whenever A~B and B~C clear the threshold, even if
   * A~C sits well below it. Requiring every pair would demand a threshold far
   * lower than detection actually needs and would manufacture false positives
   * to satisfy a constraint that was never real. So per cluster this is the
   * bottleneck: the smallest edge in its maximum spanning tree.
   */
  weakestPlanted: number;
  weakestPlantedPair: string;
  /** Strongest similarity between records NOT planted together — must be above this. */
  strongestUnplanted: number;
  strongestUnplantedPair: string;
}

/**
 * Largest t for which these records are all connected using edges >= t, plus
 * the edge that binds. Prim's algorithm on the complete similarity graph,
 * taking the heaviest edge each step; the lightest edge chosen is the answer.
 */
function bottleneck(members: Rec[]): { score: number; pair: string } {
  if (members.length < 2) return { score: 1, pair: "single" };
  const inTree = [members[0]];
  const rest = members.slice(1);
  let worst = 1;
  let worstPair = "none";
  while (rest.length > 0) {
    let best = -1;
    let bestIdx = 0;
    let bestFrom = inTree[0];
    for (let i = 0; i < rest.length; i++) {
      for (const t of inTree) {
        const score = cosine(t.embedding, rest[i].embedding);
        if (score > best) {
          best = score;
          bestIdx = i;
          bestFrom = t;
        }
      }
    }
    if (best < worst) {
      worst = best;
      worstPair = `${bestFrom.id}~${rest[bestIdx].id}`;
    }
    inTree.push(rest[bestIdx]);
    rest.splice(bestIdx, 1);
  }
  return { score: worst, pair: worstPair };
}

function analyse(variant: string, docType: "ideas" | "solutions"): Result | null {
  const file = path.join(dataDir, `dataset-${variant}-enrichment.json`);
  if (!fs.existsSync(file)) return null;
  const ds = JSON.parse(fs.readFileSync(file, "utf8"));
  const records: Rec[] = ds[docType];

  // Each planted cluster contributes its bottleneck; the threshold has to
  // clear the tightest of them.
  const clusters = new Map<string, Rec[]>();
  for (const r of records) {
    const c = plantedByKey.get(r.id);
    if (!c) continue;
    const list = clusters.get(c) ?? [];
    list.push(r);
    clusters.set(c, list);
  }

  let weakestPlanted = 1;
  let weakestPlantedPair = "none";
  for (const members of clusters.values()) {
    const b = bottleneck(members);
    if (b.pair !== "single" && b.score < weakestPlanted) {
      weakestPlanted = b.score;
      weakestPlantedPair = b.pair;
    }
  }

  let strongestUnplanted = 0;
  let strongestUnplantedPair = "none";
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const a = records[i];
      const b = records[j];
      const ca = plantedByKey.get(a.id);
      const cb = plantedByKey.get(b.id);
      if (!!ca && ca === cb) continue;
      const score = cosine(a.embedding, b.embedding);
      if (score > strongestUnplanted) {
        strongestUnplanted = score;
        strongestUnplantedPair = `${a.id}~${b.id}`;
      }
    }
  }

  if (weakestPlantedPair === "none") return null;
  return {
    variant,
    docType,
    weakestPlanted,
    weakestPlantedPair,
    strongestUnplanted,
    strongestUnplantedPair,
  };
}

const variants = ["pre", "post"];
const out: Record<string, number> = {};
let anyImpossible = false;

for (const variant of variants) {
  const parts = [analyse(variant, "ideas"), analyse(variant, "solutions")].filter(
    (r): r is Result => r !== null
  );
  if (parts.length === 0) {
    console.log(`${variant}: dataset not found — run npm run enrich first.`);
    continue;
  }

  // One threshold serves both record types, so it must satisfy the tighter of
  // the two constraints on each side.
  const weakestPlanted = Math.min(...parts.map((p) => p.weakestPlanted));
  const strongestUnplanted = Math.max(...parts.map((p) => p.strongestUnplanted));
  const tightestPlanted = parts.find((p) => p.weakestPlanted === weakestPlanted)!;
  const tightestUnplanted = parts.find((p) => p.strongestUnplanted === strongestUnplanted)!;

  console.log(`\n=== ${variant}-enrichment ===`);
  console.log(
    `  tightest planted cluster ${weakestPlanted.toFixed(4)}  ${tightestPlanted.weakestPlantedPair} (${tightestPlanted.docType})`
  );
  console.log(
    `  strongest unplanted pair ${strongestUnplanted.toFixed(4)}  ${tightestUnplanted.strongestUnplantedPair} (${tightestUnplanted.docType})`
  );

  if (weakestPlanted <= strongestUnplanted) {
    // No threshold separates them. Worth stating plainly rather than emitting a
    // number that silently loses a planted cluster or invents a false positive.
    anyImpossible = true;
    console.log(
      `  NO CLEAN THRESHOLD: an unplanted pair scores at or above a planted one.`
    );
    console.log(
      `  Either ${tightestUnplanted.strongestUnplantedPair} genuinely are near-duplicates and should be`
    );
    console.log(
      `  planted as a cluster in scripts/seed/, or ${tightestPlanted.weakestPlantedPair} are not as`
    );
    console.log(`  alike as intended and their wording should be brought closer.`);
    continue;
  }

  // Sit in the middle of the gap: the value furthest from both failure modes.
  const threshold = Math.round(((weakestPlanted + strongestUnplanted) / 2) * 10000) / 10000;
  const margin = weakestPlanted - strongestUnplanted;
  out[variant] = threshold;
  console.log(`  threshold                ${threshold.toFixed(4)}   (margin ${margin.toFixed(4)})`);
  if (margin < 0.01) {
    console.log(
      `  NOTE: margin is thin. Any regeneration is likely to move it — re-run this script rather than assuming the value holds.`
    );
  }
}

if (process.argv.includes("--write") && Object.keys(out).length > 0) {
  const enrichPath = path.join(process.cwd(), "scripts", "enrich.ts");
  let src = fs.readFileSync(enrichPath, "utf8");
  let changed = false;
  for (const [variant, value] of Object.entries(out)) {
    const constName = variant === "pre" ? "DEFAULT_THRESHOLD_PRE" : "DEFAULT_THRESHOLD_POST";
    const re = new RegExp(`(${constName}\\s*=\\s*)([0-9.]+)`);
    if (re.test(src)) {
      src = src.replace(re, `$1${value}`);
      changed = true;
    } else {
      console.log(`\nCould not find ${constName} in scripts/enrich.ts — set it by hand.`);
    }
  }
  if (changed) {
    fs.writeFileSync(enrichPath, src);
    console.log(`\nWrote thresholds into scripts/enrich.ts. Re-run npm run enrich to apply them.`);
  }
} else if (Object.keys(out).length > 0) {
  console.log(`\nRe-run with --write to set these in scripts/enrich.ts.`);
}

process.exit(anyImpossible ? 1 : 0);

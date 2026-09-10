/**
 * Lexical collision pre-flight for the seed data (v4.9.1).
 *
 * Why. Sixty-four records were authored against an existing sixty-three without
 * checking them against each other. Eleven were the same record written twice.
 * Nothing caught that until `npm run enrich` had spent real credit and
 * `verify-duplicates` printed a false-positive list — a slow, paid feedback loop
 * for a mistake that is visible in the text alone.
 *
 * This is the cheap check that runs first. It is deliberately NOT the real
 * detector: no embeddings, no API, no cost, just rarity-weighted word overlap.
 * It misses "invoice dispute" against "billing disagreement" entirely — see the
 * measurement on COLLISION_THRESHOLD below — and catches only the one failure
 * mode it was written for: a record restated in near-enough the same words.
 * That happens to be the mistake it exists to prevent.
 *
 * It warns, it does not fail. A flagged pair has two honest resolutions and the
 * script cannot tell which one applies:
 *
 *   - they really are the same want → declare it, add `cluster: "..."` to both,
 *     and the flag becomes ground truth rather than an accident;
 *   - they are meant to be different → rewrite one so it is.
 *
 * Both are fine. Silently shipping an undeclared duplicate is not, because the
 * detector will find it later and be marked wrong for being right.
 */

/** Words that carry no signal about what a record is about. */
const STOPWORDS = new Set([
  "a","an","and","are","as","at","be","been","before","being","but","by","can",
  "come","comes","could","did","do","does","each","every","for","from","get",
  "gets","give","gives","go","goes","had","has","have","how","i","if","in","into",
  "is","it","its","just","keep","kept","like","made","make","makes","many","may",
  "much","must","need","needs","no","not","now","of","off","on","one","only","or",
  "other","our","out","over","own","put","puts","same","see","set","should","so",
  "some","take","takes","than","that","the","their","them","then","there","these",
  "they","thing","things","this","those","through","time","times","to","too","up",
  "us","use","used","uses","very","want","wants","was","way","we","went","were",
  "what","when","where","which","while","who","why","will","with","without","work",
  "works","would","you","your","it's","does","doing","done","also","still","again",
  "something","someone","somebody","anything","nothing","everyone","nobody",
  "instead","rather","across","against","around","because","between","during",
  "under","until","about","after","all","already","always","another","any","back",
  "both","down","even","first","here","last","least","less","most","new","next",
  "once","per","right","same","several","since","three","two","usually","well",
]);

/** Crude suffix stripping — enough to make "chasing" and "chase" the same word. */
function stem(word: string): string {
  let w = word;
  for (const suffix of ["ing", "ed", "es", "s"]) {
    if (w.length > suffix.length + 3 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length);
      break;
    }
  }
  return w;
}

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
      .map(stem)
  );
}

/**
 * Inverse-document-frequency cosine over the record's words.
 *
 * The first version used plain word overlap with the title weighted triple, and
 * it was useless: it flagged "Meeting Write-Up Assistant" against "Procedure
 * Q&A Assistant" and "First Response Drafter" against "Job Description
 * Drafter". Those pairs share nothing but a job-title noun. A catalog of
 * automation records is full of words like drafter, report, assistant, script
 * and queue, and their overlap says nothing at all.
 *
 * What matters is shared RARE words. Two records that both say "parking" and
 * "waitlist", or both say "exit" and "interviews", are about the same thing;
 * two that both say "report" are not. So each word is weighted by how rare it
 * is across the corpus, and the score is the cosine of those weighted vectors.
 * Title and body are pooled — a distinctive word is distinctive wherever it
 * appears.
 */
function idfWeights(docs: Set<string>[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const doc of docs) {
    for (const t of doc) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const n = docs.length;
  const idf = new Map<string, number>();
  for (const [t, count] of df) idf.set(t, Math.log((n + 1) / (count + 0.5)));
  return idf;
}

function weightedCosine(
  a: Set<string>,
  b: Set<string>,
  idf: Map<string, number>
): number {
  let shared = 0;
  let na = 0;
  let nb = 0;
  for (const t of a) {
    const w = idf.get(t) ?? 0;
    na += w * w;
    if (b.has(t)) shared += w * w;
  }
  for (const t of b) {
    const w = idf.get(t) ?? 0;
    nb += w * w;
  }
  return na && nb ? shared / Math.sqrt(na * nb) : 0;
}

export interface CollisionInput {
  key: string;
  title: string;
  body: string;
  cluster?: string | null;
}

export interface Collision {
  a: string;
  b: string;
  score: number;
}

/**
 * 0.28 flags roughly the top 1% of pairs in this corpus.
 *
 * Measured, not assumed. Run against the seven declared duplicate clusters with
 * the cluster guard off, the scores spread from 0.00 to 0.79 — so this check
 * does NOT separate real duplicates from unrelated records, and a threshold
 * that caught all of them would flag hundreds of pairs. The declared pair
 * `dup-a-1`~`dup-a-2` ("Handle invoice disputes better" / "Sort dispute emails
 * by reason code") scores 0.00 here and is unmistakable to an embedding.
 *
 * That is the honest boundary of a lexical check and the reason this warns
 * rather than gates. It catches ONE failure mode: a record restated in
 * near-enough the same words, which is the mistake that produced eleven
 * accidental duplicates in v4.9. Semantic duplicates in different vocabulary
 * are what `npm run enrich` and the cosine threshold are for, and nothing here
 * replaces them.
 */
export const COLLISION_THRESHOLD = 0.28;

export function findCollisions(
  records: CollisionInput[],
  threshold = COLLISION_THRESHOLD,
  /** Test hook: ignore declared clusters, to check the scale still separates them. */
  includeDeclared = false
): Collision[] {
  const docs = records.map((r) => tokens(`${r.title} ${r.title} ${r.body}`));
  const idf = idfWeights(docs);
  const out: Collision[] = [];
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      // A declared cluster is the author saying "yes, these are the same" —
      // that is the resolution, not the problem.
      if (
        !includeDeclared &&
        records[i].cluster &&
        records[i].cluster === records[j].cluster
      )
        continue;
      const score = weightedCosine(docs[i], docs[j], idf);
      if (score >= threshold) out.push({ a: records[i].key, b: records[j].key, score });
    }
  }
  return out.sort((x, y) => y.score - x.score);
}

/** Console report. Returns the number of collisions found. */
export function reportCollisions(label: string, records: CollisionInput[]): number {
  const hits = findCollisions(records);
  if (hits.length === 0) {
    console.log(`Collision pre-flight (${label}): none above ${COLLISION_THRESHOLD}.`);
    return 0;
  }
  console.log(
    `\nCollision pre-flight (${label}): ${hits.length} pair${hits.length === 1 ? "" : "s"} worth a look.`
  );
  const byKey = new Map(records.map((r) => [r.key, r]));
  for (const h of hits) {
    console.log(`  ${h.score.toFixed(2)}  ${h.a}  "${byKey.get(h.a)?.title}"`);
    console.log(`        ${h.b}  "${byKey.get(h.b)?.title}"`);
  }
  console.log(
    `  Each is either a real duplicate (give both the same \`cluster\`) or an\n` +
      `  accident (rewrite one). Leaving it undeclared makes verify-duplicates\n` +
      `  fail later, after enrich has already been paid for.\n`
  );
  return hits.length;
}

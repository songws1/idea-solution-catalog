/**
 * Does enrichment actually improve retrieval? (v4.10)
 *
 * The README has claimed since day one that it does. That claim was never
 * measured — two datasets were built, a few queries were eyeballed, and the
 * claim went into the README as a headline. This measures it, offline, with no
 * API key, using only the committed embeddings.
 *
 * Enrichment changes two things at once, so they are measured separately or
 * the result means nothing:
 *
 *   A. SOLUTIONS gain an LLM-written summary in their embedded text.
 *   B. IDEAS gain their solution's language written back onto them.
 *
 * Each test holds the query fixed and swaps only the corpus, so the number
 * attributes to one change rather than to both at once.
 */
import fs from "node:fs";
import path from "node:path";

interface Rec {
  id: string;
  embedding: number[];
  linked_solution_id?: string | null;
  resolves_idea_id?: string | null;
  title?: string;
  name?: string;
}

function cosine(a: number[], b: number[]): number {
  let d = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i];
    x += a[i] * a[i];
    y += b[i] * b[i];
  }
  return d / Math.sqrt(x * y);
}

const dir = path.join(process.cwd(), "data");
const pre = JSON.parse(fs.readFileSync(path.join(dir, "dataset-pre-enrichment.json"), "utf8"));
const post = JSON.parse(fs.readFileSync(path.join(dir, "dataset-post-enrichment.json"), "utf8"));

/** Rank of `targetId` when `corpus` is sorted by similarity to `query`. 1 = best. */
function rankOf(query: number[], corpus: Rec[], targetId: string): number {
  const scored = corpus
    .map((r) => ({ id: r.id, s: cosine(query, r.embedding) }))
    .sort((a, b) => b.s - a.s);
  return scored.findIndex((r) => r.id === targetId) + 1;
}

interface Summary {
  n: number;
  top1: number;
  top3: number;
  meanRank: number;
  mrr: number;
}

function summarise(ranks: number[]): Summary {
  return {
    n: ranks.length,
    top1: ranks.filter((r) => r === 1).length,
    top3: ranks.filter((r) => r <= 3).length,
    meanRank: ranks.reduce((a, b) => a + b, 0) / ranks.length,
    mrr: ranks.reduce((a, b) => a + 1 / b, 0) / ranks.length,
  };
}

function report(label: string, before: Summary, after: Summary): void {
  const pct = (n: number, d: number) => `${((n / d) * 100).toFixed(0)}%`;
  console.log(`\n=== ${label} (n=${before.n}) ===`);
  console.log(`                    pre        post`);
  console.log(
    `  target ranked #1  ${String(before.top1).padStart(3)} ${pct(before.top1, before.n).padStart(5)}   ${String(after.top1).padStart(3)} ${pct(after.top1, after.n).padStart(5)}`
  );
  console.log(
    `  target in top 3   ${String(before.top3).padStart(3)} ${pct(before.top3, before.n).padStart(5)}   ${String(after.top3).padStart(3)} ${pct(after.top3, after.n).padStart(5)}`
  );
  console.log(
    `  mean rank         ${before.meanRank.toFixed(2).padStart(9)}   ${after.meanRank.toFixed(2).padStart(9)}`
  );
  console.log(
    `  MRR               ${before.mrr.toFixed(3).padStart(9)}   ${after.mrr.toFixed(3).padStart(9)}`
  );
}

// ---------------------------------------------------------------------------
// Test A — does the LLM summary on a SOLUTION make it easier to find?
//
// This is the product's actual job: someone describes a problem, the catalog
// finds the built solution. The query is the idea's PRE embedding, which is the
// submitter's own problem wording with nothing added — the closest stand-in for
// what a person types. Only the solution corpus is swapped.
// ---------------------------------------------------------------------------
const preIdeas: Rec[] = pre.ideas;
const preIdeaById = Object.fromEntries(preIdeas.map((i) => [i.id, i]));
const linked = preIdeas.filter((i) => i.linked_solution_id);

const aBefore: number[] = [];
const aAfter: number[] = [];
for (const idea of linked) {
  const target = idea.linked_solution_id as string;
  aBefore.push(rankOf(idea.embedding, pre.solutions, target));
  aAfter.push(rankOf(idea.embedding, post.solutions, target));
}
report("A. problem wording -> its solution (LLM summary on solutions)", summarise(aBefore), summarise(aAfter));

// ---------------------------------------------------------------------------
// Test B — does writing solution language back onto an IDEA make that idea
// findable from solution wording?
//
// This is the specific claim the write-back exists to support. The query is the
// solution's PRE embedding, held fixed; only the idea corpus is swapped.
// ---------------------------------------------------------------------------
const preSolById = Object.fromEntries((pre.solutions as Rec[]).map((s) => [s.id, s]));
const bBefore: number[] = [];
const bAfter: number[] = [];
for (const idea of linked) {
  const sol = preSolById[idea.linked_solution_id as string];
  if (!sol) continue;
  bBefore.push(rankOf(sol.embedding, pre.ideas, idea.id));
  bAfter.push(rankOf(sol.embedding, post.ideas, idea.id));
}
report("B. solution wording -> its idea (write-back on ideas)", summarise(bBefore), summarise(bAfter));

// ---------------------------------------------------------------------------
// Test C — the cost of B. Write-back makes solved ideas look like their
// solutions, which should push them UP against solution-shaped queries whether
// or not they are the right answer. If unrelated solved ideas start crowding
// the top, the write-back is buying findability with noise.
// ---------------------------------------------------------------------------
const solvedIds = new Set(linked.map((i) => i.id));
function crowding(ideas: Rec[]): number {
  // Mean share of the top 10 taken by solved ideas, across every solution query.
  let total = 0;
  for (const sol of pre.solutions as Rec[]) {
    const top = ideas
      .map((r) => ({ id: r.id, s: cosine(sol.embedding, r.embedding) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 10);
    total += top.filter((t) => solvedIds.has(t.id)).length / 10;
  }
  return total / pre.solutions.length;
}
console.log(`\n=== C. crowding: share of top-10 ideas that are solved ideas ===`);
console.log(`  pre  ${(crowding(pre.ideas) * 100).toFixed(1)}%`);
console.log(`  post ${(crowding(post.ideas) * 100).toFixed(1)}%`);
console.log(
  `  (${solvedIds.size} of ${pre.ideas.length} ideas are solved, so ${((solvedIds.size / pre.ideas.length) * 100).toFixed(1)}% is the neutral baseline)`
);

// ---------------------------------------------------------------------------
// Test D — the vague records, which are the whole point.
//
// Tests A and B run at a 94% base rate, which means they are saturated and
// cannot separate anything: at most 6 points are available to win. That is
// because they pair a record with a description of the same thing, which
// embeddings match trivially.
//
// The records enrichment is actually FOR are the thin one-liners: "Better
// onboarding", "Spend dashboard", "Vendor scorecards". A person searching for
// what those mean has nothing to match against. That subset is where headroom
// exists, so that subset is where the claim has to be tested.
//
// The query here is the SOLUTION's wording and the target is the vague idea:
// can someone describing the built thing find the thin request behind it?
// ---------------------------------------------------------------------------
const seedRecords = JSON.parse(fs.readFileSync(path.join(dir, "seed-records.json"), "utf8"));
const vagueIds = new Set(
  seedRecords.ideas.filter((i: { _vague?: boolean }) => i._vague).map((i: { id: string }) => i.id)
);
const vagueLinked = linked.filter((i) => vagueIds.has(i.id));

const dBefore: number[] = [];
const dAfter: number[] = [];
for (const idea of vagueLinked) {
  const sol = preSolById[idea.linked_solution_id as string];
  if (!sol) continue;
  dBefore.push(rankOf(sol.embedding, pre.ideas, idea.id));
  dAfter.push(rankOf(sol.embedding, post.ideas, idea.id));
}
report("D. solution wording -> its VAGUE idea", summarise(dBefore), summarise(dAfter));
console.log("  per record:");
vagueLinked.forEach((idea, i) => {
  console.log(
    `    ${String(dBefore[i]).padStart(3)} -> ${String(dAfter[i]).padStart(3)}   "${idea.title}"`
  );
});

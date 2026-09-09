/**
 * Offline verification for the "before you build" overlap check (v4.4).
 *
 * The route needs an OpenRouter key to embed a typed description, but the
 * verdict logic does not: it grades a retrieval result, and the dataset already
 * carries embeddings. So this drives `retrieve` + `assessOverlap` with real
 * vectors and asserts the verdicts, with no API key and no spend.
 *
 * Run: npx tsx scripts/check-overlap.ts
 */
import { loadDataset } from "../lib/dataset";
import { toClientRecord } from "../lib/client-records";
import { retrieve } from "../lib/retrieval";
import { assessOverlap } from "../lib/overlap";
import type { ClientScoredResult } from "../lib/types";

const dataset = loadDataset("post");

let failures = 0;
function check(label: string, pass: boolean, detail = "") {
  console.log(`${pass ? "OK  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

function assess(embedding: number[]) {
  const outcome = retrieve(dataset, embedding, { topDirect: 8 });
  const ideas: ClientScoredResult[] = outcome.ideas.map((r) => ({
    ...r,
    record: toClientRecord(r.record),
  }));
  const solutions: ClientScoredResult[] = outcome.solutions.map((r) => ({
    ...r,
    record: toClientRecord(r.record),
  }));
  return assessOverlap(ideas, solutions);
}

// 1. A built solution's own text must come back as "already built". If the
//    check cannot recognise an exact restatement of an existing solution, it
//    cannot recognise anything.
const sol = dataset.solutions[0];
const solResult = assess(sol.embedding);
check(
  "an existing solution's own text verdicts as exists",
  solResult.verdict === "exists",
  `verdict ${solResult.verdict}, top ${solResult.topScore.toFixed(4)}`
);
check(
  "the matching solution is named first",
  solResult.solutions[0]?.record.id === sol.id,
  `first match ${solResult.solutions[0]?.record.id ?? "none"} vs ${sol.id}`
);

// 2. An unsolved idea's own text must surface as "already asked", not as a
//    build instruction. This is the distinction ordinary search flattens.
const openIdea = dataset.ideas.find(
  (i) => i.status !== "solved" && !i.linked_solution_id
);
if (!openIdea) {
  check("dataset has an unsolved idea to test", false);
} else {
  const ideaResult = assess(openIdea.embedding);
  check(
    "an unsolved idea's own text surfaces that idea",
    ideaResult.ideas.some((m) => m.record.id === openIdea.id),
    `verdict ${ideaResult.verdict}, ${ideaResult.ideas.length} idea matches`
  );
  check(
    "verdict is exists or already-asked, never clear",
    ideaResult.verdict === "already-asked" || ideaResult.verdict === "exists",
    `verdict ${ideaResult.verdict}`
  );
}

// 3. Noise must verdict clear and return nothing. A confident wrong "this
//    already exists" is the one failure this feature cannot afford.
const noise = new Array(dataset.solutions[0].embedding.length)
  .fill(0)
  .map((_, i) => Math.sin(i * 12.9898) * 0.001);
const noiseResult = assess(noise);
check(
  "unrelated vector verdicts as clear",
  noiseResult.verdict === "clear",
  `verdict ${noiseResult.verdict}, top ${noiseResult.topScore.toFixed(4)}`
);
check(
  "a clear verdict shows no matches",
  noiseResult.solutions.length === 0 && noiseResult.ideas.length === 0,
  `${noiseResult.solutions.length} solutions, ${noiseResult.ideas.length} ideas`
);

// 4. Solved ideas never appear as "already asked" — they are represented by
//    the solution that resolved them, which is the actionable record.
const solvedIds = new Set(
  dataset.ideas.filter((i) => i.status === "solved").map((i) => i.id)
);
let solvedLeak = 0;
for (const s of dataset.solutions.slice(0, 10)) {
  const r = assess(s.embedding);
  if (r.ideas.some((m) => solvedIds.has(m.record.id))) solvedLeak++;
}
check("solved ideas never listed as still-asked", solvedLeak === 0, `${solvedLeak} leaks`);

// 5. Every solution resolves to a verdict without throwing, and no verdict
//    lists more than three of either kind.
let overLong = 0;
for (const s of dataset.solutions) {
  const r = assess(s.embedding);
  if (r.solutions.length > 3 || r.ideas.length > 3) overLong++;
}
check("no verdict lists more than three of either kind", overLong === 0, `${overLong} over`);

console.log(
  failures === 0
    ? "\nOVERLAP CHECKS: ALL PASS"
    : `\nOVERLAP CHECKS: ${failures} FAILED`
);
process.exit(failures === 0 ? 0 : 1);

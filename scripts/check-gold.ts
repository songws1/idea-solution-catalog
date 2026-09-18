/**
 * Score the catalog against the human-written gold query set (v4.17).
 *
 * What this measures, and what the other checks do not. check-overlap and
 * check-scale query with a record's own vector, so a 98% pass rate there means
 * records can find themselves. This runs the real pipeline over 35 sentences a
 * person might actually type, against expectations a person decided, and so it
 * is the only number in the repo that is about search rather than about
 * self-retrieval. Expect it to be lower, and expect that to be the useful part.
 *
 * It reports two recalls, because they fail for different reasons and need
 * different fixes:
 *
 *   found     — the expected record was in the top 8 the retriever returned.
 *               A miss here is a retrieval problem: the embedding of the
 *               question and the embedding of the record are not close.
 *   shown     — the expected record survived the thresholds and reached the
 *               reader. A record that is found but not shown is a threshold
 *               problem, and the thresholds are ours to move.
 *
 * Offline: the questions carry their vectors (scripts/embed-gold.ts), so no key
 * and no spend.
 *
 * Run: npm run check-gold
 *      npm run check-gold -- --save-baseline   (record today's result as the bar)
 *      npm run check-gold -- --verbose         (per-question detail, misses named)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { toClientRecord } from "../lib/client-records";
import { loadDataset } from "../lib/dataset";
import { datasetFingerprint, type GoldBaseline, type GoldFile } from "../lib/gold";
import { assessOverlap, findTwicePair, type OverlapResult, type OverlapVerdict } from "../lib/overlap";
import { retrieve } from "../lib/retrieval";
import type { ClientScoredResult } from "../lib/types";

const GOLD_PATH = resolve(process.cwd(), "data/gold-queries.json");
const BASELINE_PATH = resolve(process.cwd(), "data/gold-baseline.json");

const saveBaseline = process.argv.includes("--save-baseline");
const verbose = process.argv.includes("--verbose");

const gold = JSON.parse(readFileSync(GOLD_PATH, "utf8")) as GoldFile;
const dataset = loadDataset(gold.written_against.dataset_variant === "pre" ? "pre" : "post");

let failures = 0;
function check(label: string, pass: boolean, detail = "") {
  console.log(`${pass ? "OK  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

// ---------------------------------------------------------------------------
// Guards. These run before any scoring, because a score against the wrong
// corpus or the wrong model is worse than no score: it looks like evidence.
// ---------------------------------------------------------------------------

const fingerprint = datasetFingerprint(dataset);
if (fingerprint !== gold.written_against.fingerprint) {
  console.error(
    [
      "",
      "  The catalog's records have changed since these questions were written.",
      "",
      `    questions written against  ${gold.written_against.fingerprint}`,
      `    dataset today              ${fingerprint}`,
      "",
      "  The expectations in data/gold-queries.json say things like 'nothing in",
      "  the catalog covers this' and 'this was only ever asked, never built'.",
      "  Both stop being true when records are added, rewritten, or solved, and",
      "  neither failure announces itself — the check would simply start being",
      "  wrong in a way that reads as a search regression.",
      "",
      "  What to do: re-read the 35 questions against the records the catalog",
      "  holds now, fix the expectations that moved, update written_against in",
      "  the file, re-run `npm run embed-gold` if any question text changed, and",
      "  delete data/gold-baseline.json — the old bar was set on a different",
      "  corpus and is not a bar any more.",
      "",
    ].join("\n")
  );
  process.exit(1);
}

if (gold.embedding_model === null || gold.queries.some((q) => !q.embedding)) {
  const missing = gold.queries.filter((q) => !q.embedding).length;
  console.error(
    `${missing} of ${gold.queries.length} questions have no vector yet.\n` +
      "Run once with your key: OPENROUTER_API_KEY=... npm run embed-gold\n" +
      "Then commit data/gold-queries.json; every run after that is offline."
  );
  process.exit(1);
}

if (gold.embedding_model !== dataset.embedding_model) {
  console.error(
    `Questions embedded with ${gold.embedding_model}, corpus with ${dataset.embedding_model}.\n` +
      "Cosine similarity across two models is not a smaller number, it is a meaningless one.\n" +
      "Re-run `npm run embed-gold -- --force` with the matching model."
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Run the real pipeline, exactly as /api/check does once it has a vector.
// ---------------------------------------------------------------------------

interface Scored {
  id: string;
  grade: string;
  expected: OverlapVerdict;
  got: OverlapVerdict;
  verdictOk: boolean;
  foundRecall: number;
  shownRecall: number;
  missingFound: string[];
  missingShown: string[];
  twiceOk: boolean;
  topScore: number;
  extras: string[];
}

function assess(embedding: number[]): { result: OverlapResult; retrievedIds: Set<string> } {
  const outcome = retrieve(dataset, embedding, { topDirect: 8 });
  const ideas: ClientScoredResult[] = outcome.ideas.map((r) => ({
    ...r,
    record: toClientRecord(r.record),
  }));
  const solutions: ClientScoredResult[] = outcome.solutions.map((r) => ({
    ...r,
    record: toClientRecord(r.record),
  }));
  const retrievedIds = new Set([...ideas, ...solutions].map((r) => r.record.id));
  return { result: assessOverlap(ideas, solutions), retrievedIds };
}

const rows: Scored[] = gold.queries.map((q) => {
  const { result, retrievedIds } = assess(q.embedding as number[]);
  const shownIds = new Set([...result.solutions, ...result.ideas].map((m) => m.record.id));
  const expected = q.expect.records;

  const missingFound = expected.filter((id) => !retrievedIds.has(id));
  const missingShown = expected.filter((id) => !shownIds.has(id));

  // On `clear` the expected record set is empty, so recall is vacuously 1 and
  // the real test is that nothing was shown. Anything surfaced against a
  // question whose right answer is "nothing like this exists" is the expensive
  // failure: it sends someone to a record that does not help them.
  const extras =
    q.expect.verdict === "clear" ? [...shownIds] : [...shownIds].filter((id) => !expected.includes(id));

  return {
    id: q.id,
    grade: q.grade.toUpperCase(),
    expected: q.expect.verdict,
    got: result.verdict,
    verdictOk: result.verdict === q.expect.verdict,
    foundRecall: expected.length === 0 ? 1 : (expected.length - missingFound.length) / expected.length,
    shownRecall: expected.length === 0 ? 1 : (expected.length - missingShown.length) / expected.length,
    missingFound,
    missingShown,
    twiceOk: q.expect.twice ? findTwicePair(result) !== null : true,
    topScore: result.topScore,
    extras,
  };
});

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const pad = (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length));

console.log("");
console.log(`Gold set — ${gold.queries.length} human-written questions, corpus ${fingerprint}`);
console.log("");
console.log(
  `${pad("id", 5)}${pad("grade", 6)}${pad("expected", 14)}${pad("got", 14)}${pad("found", 7)}${pad("shown", 7)}top`
);
console.log("-".repeat(62));
for (const r of rows) {
  const flag = r.verdictOk ? " " : "*";
  console.log(
    `${flag}${pad(r.id, 4)}${pad(r.grade, 6)}${pad(r.expected, 14)}${pad(r.got, 14)}` +
      `${pad(r.expected === "clear" ? "-" : r.foundRecall.toFixed(2), 7)}` +
      `${pad(r.expected === "clear" ? "-" : r.shownRecall.toFixed(2), 7)}` +
      r.topScore.toFixed(3)
  );
  if (verbose) {
    if (r.missingFound.length) console.log(`      not retrieved: ${r.missingFound.join(", ")}`);
    else if (r.missingShown.length) console.log(`      retrieved but not shown: ${r.missingShown.join(", ")}`);
    if (r.extras.length) console.log(`      also shown: ${r.extras.join(", ")}`);
  }
}
console.log("");

const n = rows.length;
const verdictsCorrect = rows.filter((r) => r.verdictOk).length;
const scoredRows = rows.filter((r) => r.expected !== "clear");
const meanFound = scoredRows.reduce((a, r) => a + r.foundRecall, 0) / scoredRows.length;
const meanShown = scoredRows.reduce((a, r) => a + r.shownRecall, 0) / scoredRows.length;

console.log(`verdict correct   ${verdictsCorrect}/${n}  (${((verdictsCorrect / n) * 100).toFixed(0)}%)`);
console.log(`expected records found  ${(meanFound * 100).toFixed(0)}%   shown  ${(meanShown * 100).toFixed(0)}%`);

// Per-verdict, because an overall number hides the asymmetry that matters: a
// wrong "exists" sends someone to a tool that does not do the job, a wrong
// "clear" only costs them a second look.
const classes: OverlapVerdict[] = ["exists", "already-asked", "related", "clear"];
console.log("");
console.log("by expected verdict:");
for (const c of classes) {
  const group = rows.filter((r) => r.expected === c);
  if (!group.length) continue;
  const ok = group.filter((r) => r.verdictOk).length;
  const wrong = group.filter((r) => !r.verdictOk).map((r) => `${r.id}→${r.got}`);
  console.log(`  ${pad(c, 14)} ${ok}/${group.length}${wrong.length ? `   ${wrong.join(", ")}` : ""}`);
}
console.log("");

// Invariants, as opposed to the score above. These are the promises that hold
// whatever the retrieval quality is, so they are failures rather than numbers.
check(
  "every question carries a vector of the corpus dimension",
  gold.queries.every((q) => q.embedding?.length === dataset.solutions[0].embedding.length)
);
check(
  "no question expecting 'built twice' loses the pair",
  rows.every((r) => r.twiceOk),
  rows.filter((r) => !r.twiceOk).map((r) => r.id).join(", ")
);
check(
  "a clear verdict never shows a record",
  rows.every((r) => r.got !== "clear" || r.extras.length === 0)
);
check(
  "every verdict class is represented, so the set cannot pass vacuously",
  classes.every((c) => rows.some((r) => r.expected === c))
);

// ---------------------------------------------------------------------------
// Baseline. The score is not expected to be 100% — the point is that it must
// not quietly get worse while someone is changing thresholds or retrieval.
// ---------------------------------------------------------------------------

const today: GoldBaseline = {
  saved_at: new Date().toISOString(),
  embedding_model: gold.embedding_model,
  fingerprint,
  verdicts_correct: verdictsCorrect,
  n,
  per_query: Object.fromEntries(rows.map((r) => [r.id, { verdict: r.verdictOk, recall: r.shownRecall }])),
};

if (saveBaseline) {
  writeFileSync(BASELINE_PATH, `${JSON.stringify(today, null, 2)}\n`);
  console.log(`\nBaseline saved: ${verdictsCorrect}/${n} verdicts. Commit data/gold-baseline.json.`);
} else if (!existsSync(BASELINE_PATH)) {
  console.log(
    "\nNo baseline yet. If this run is the bar you want to hold, run:\n" +
      "  npm run check-gold -- --save-baseline"
  );
} else {
  const base = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as GoldBaseline;
  if (base.fingerprint !== fingerprint) {
    console.log("\nBaseline was set against a different corpus; ignoring it. Re-save when ready.");
  } else {
    const lostVerdict = rows.filter((r) => base.per_query[r.id]?.verdict && !r.verdictOk).map((r) => r.id);
    const lostRecall = rows
      .filter((r) => base.per_query[r.id] && r.shownRecall < base.per_query[r.id].recall - 1e-9)
      .map((r) => `${r.id} ${base.per_query[r.id].recall.toFixed(2)}→${r.shownRecall.toFixed(2)}`);
    check(
      "no question that used to get the right verdict now gets a wrong one",
      lostVerdict.length === 0,
      lostVerdict.join(", ")
    );
    check("no question surfaces fewer of its expected records", lostRecall.length === 0, lostRecall.join("; "));
    const gained = verdictsCorrect - base.verdicts_correct;
    console.log(
      `\nAgainst baseline of ${base.saved_at.slice(0, 10)}: ${gained >= 0 ? "+" : ""}${gained} verdicts.` +
        (gained > 0 ? " Re-save with --save-baseline to hold the new bar." : "")
    );
  }
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);

/**
 * Offline verification for the trust/staleness scale (v4.8).
 *
 * Run: npx tsx scripts/check-freshness.ts   (no API key, no spend)
 *
 * The point of these assertions is not that the arithmetic works — it is that
 * the board, the drawer and the governance dashboard cannot drift apart. Three
 * views grade the same records, and the failure this catches is the one that
 * would quietly discredit all three: a dashboard row saying "3 over 12 months"
 * while the board marks a different set of cards.
 */
import { loadDataset } from "../lib/dataset";
import { agingBucket, ideaAgeDays, solutionReviewAgeDays } from "../lib/aging";
import { agingData, summaryTiles } from "../lib/governance";
import {
  freshnessMark,
  freshnessSentence,
  ideaFreshness,
  isCardWorthy,
  isNoteworthy,
  monthsSince,
  solutionFreshness,
} from "../lib/freshness";

const dataset = loadDataset("post");
const now = new Date();

let failures = 0;
function check(label: string, pass: boolean, detail = ""): void {
  console.log(`${pass ? "OK  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

// 1. A fresh record must carry no mark. If "normal" gets a label, the board
//    gains 65 labels and the mark stops meaning anything.
const currentSolutions = dataset.solutions.filter(
  (s) => solutionFreshness(s, now) === "current"
);
check(
  "current solutions are silent",
  currentSolutions.every((s) => !isNoteworthy(solutionFreshness(s, now))),
  `${currentSolutions.length} current of ${dataset.solutions.length}`
);

// 2. Every tier must actually occur in the committed dataset. A scale whose
//    tiers never fire is untested decoration.
const solStates = new Set(dataset.solutions.map((s) => solutionFreshness(s, now)));
check(
  "every solution tier occurs in the dataset",
  ["current", "aging", "stale", "unreviewed"].every((t) => solStates.has(t as never)),
  [...solStates].sort().join(", ")
);
const openIdeas = dataset.ideas.filter((i) => i.status === "open");
const ideaStates = new Set(openIdeas.map((i) => ideaFreshness(i, now)));
check(
  "every idea tier occurs in the dataset",
  ["current", "waiting", "dormant"].every((t) => ideaStates.has(t as never)),
  [...ideaStates].sort().join(", ")
);

// 3. A record with no review date is "unreviewed", never "current". Falling
//    through to current would tell a reader an unvouched-for build is fine.
const noReview = dataset.solutions.filter((s) => !s.date_last_reviewed);
check(
  "never-reviewed solutions never read as current",
  noReview.every((s) => solutionFreshness(s, now) === "unreviewed"),
  `${noReview.length} with no review date`
);

// 3b. Card marks must stay rare enough to read as flags. Caught in review at
//     40 of 65: at that density a pill is part of the card template, not a
//     signal, and it undoes two rounds of density work on this board.
const boardCards = [
  ...dataset.solutions.map((s) => solutionFreshness(s, now)),
  ...openIdeas.map((i) => ideaFreshness(i, now)),
];
const markedCards = boardCards.filter(isCardWorthy).length;
check(
  "fewer than half the board's cards carry a trust mark",
  markedCards / boardCards.length < 0.5,
  `${markedCards} of ${boardCards.length}`
);
check(
  "the reassuring tiers never reach a card",
  !isCardWorthy("aging") && !isCardWorthy("waiting"),
  "aging and waiting are drawer-only"
);

// 4. THE DRIFT CHECK. The governance table's "over 12 months" column plus its
//    never-reviewed column must be exactly the set of solutions the board
//    marks red. Two scales tuned independently would pass every other test
//    here and still disagree in front of a reviewer.
const boardStale = dataset.solutions.filter((s) => {
  const state = solutionFreshness(s, now);
  return state === "stale" || state === "unreviewed";
}).length;
const rows = agingData(dataset, now).solutions;
const tableStale = rows.reduce((n, r) => n + r.old + r.neverReviewed, 0);
check(
  "governance old+never equals the board's red marks",
  boardStale === tableStale,
  `board ${boardStale} vs table ${tableStale}`
);

// Same for ideas: the dashboard's over-12-months count against the dormant
// cards. Ideas have no "never" column, so this is a straight equality.
const boardDormant = openIdeas.filter((i) => ideaFreshness(i, now) === "dormant").length;
const ideaRows = agingData(dataset, now).ideas;
const tableDormantAll = ideaRows.reduce((n, r) => n + r.old, 0);
const inProgressDormant = dataset.ideas.filter(
  (i) =>
    i.status === "in_progress" &&
    agingBucket(ideaAgeDays(i.submitted_date, now), "idea") === "over 12 months"
).length;
check(
  "governance old ideas equals dormant cards plus in-progress",
  tableDormantAll === boardDormant + inProgressDormant,
  `table ${tableDormantAll} vs ${boardDormant} dormant + ${inProgressDormant} in progress`
);

// 5. Every aging row must add up to the records it covers — a bucket that
//    silently drops a record makes the dashboard understate the problem.
const solTotal = rows.reduce((n, r) => n + r.recent + r.mid + r.old + r.neverReviewed, 0);
check(
  "aging buckets account for every solution",
  solTotal === dataset.solutions.length,
  `${solTotal} of ${dataset.solutions.length}`
);
const unsolved = dataset.ideas.filter((i) => i.status !== "solved").length;
const ideaTotal = ideaRows.reduce((n, r) => n + r.recent + r.mid + r.old, 0);
check(
  "aging buckets account for every unsolved idea",
  ideaTotal === unsolved,
  `${ideaTotal} of ${unsolved}`
);

// 6. The buckets must actually spread. This is what was wrong before v4.8:
//    30/90-day boundaries put 20 of 25 solutions in one column, so the widget
//    drew one bar and told a reviewer nothing.
const solCols = [
  rows.reduce((n, r) => n + r.recent, 0),
  rows.reduce((n, r) => n + r.mid, 0),
  rows.reduce((n, r) => n + r.old, 0) + rows.reduce((n, r) => n + r.neverReviewed, 0),
];
check(
  "no aging column holds more than 70% of solutions",
  Math.max(...solCols) / dataset.solutions.length <= 0.7,
  solCols.join(" / ")
);

// 7. The headline tile must count the same thing the board marks.
const tiles = summaryTiles(dataset, now);
const tile = tiles.find((t) => t.label === "Not confirmed working");
check(
  "summary tile matches the board's red marks",
  tile?.value === boardStale,
  `tile ${tile?.value ?? "missing"} vs board ${boardStale}`
);

// 8. Copy must be complete: a mark with no words, or a sentence with a stray
//    "null months", is a rendered bug rather than a caught one.
const marked = [
  ...dataset.solutions.map((s) => ({
    state: solutionFreshness(s, now),
    months: monthsSince(s.date_last_reviewed, now),
  })),
  ...openIdeas.map((i) => ({
    state: ideaFreshness(i, now),
    months: monthsSince(i.submitted_date, now),
  })),
].filter((r) => isNoteworthy(r.state));
check(
  "every noteworthy state produces a non-empty mark and sentence",
  marked.every((r) => {
    const mark = freshnessMark(r.state, r.months);
    const sentence = freshnessSentence(r.state, r.months);
    return mark.length > 0 && !!sentence && !/null|NaN|undefined/.test(mark + sentence);
  }),
  `${marked.length} marked records`
);

console.log(
  failures === 0 ? "\nFRESHNESS CHECKS: ALL PASS" : `\nFRESHNESS CHECKS: ${failures} FAILED`
);
process.exit(failures === 0 ? 0 : 1);

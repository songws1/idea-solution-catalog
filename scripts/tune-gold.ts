/**
 * Derive the verdict floors from the gold query set (v4.18).
 *
 * The three absolute floors in lib/match-label.ts were set by eye against
 * record-to-record scores, which run 0.9 and up. A typed question is shorter
 * and differently worded than the record it should match, so the whole
 * distribution compresses into roughly 0.39 to 0.83, and a floor picked for the
 * first distribution does not discriminate on the second. The first gold run
 * showed what that costs: the `clear` verdict was wrong on all 7 of its
 * questions, because "is anything here at all" was gated at 0.30 while
 * unrelated questions score up to 0.504.
 *
 * This is the same move `tune-duplicates` makes for the duplicate threshold:
 * compute the boundary from ground truth instead of choosing it. Three things
 * keep it honest:
 *
 *   1. It sweeps the REAL grading function. assessOverlap takes the thresholds
 *      as a parameter (lib/overlap.ts) rather than this script re-implementing
 *      the rule, so the setting it recommends is a setting for the rule the page
 *      actually follows.
 *   2. It reports the width of the winning plateau, not just the winner. A
 *      maximum that sits alone on a spike is a number fitted to 35 questions. A
 *      maximum that holds across a broad range is a boundary. The script says
 *      which one it found, and recommends the middle of the plateau rather than
 *      its edge, because the edge is where the next corpus pushes you off.
 *   3. It only recommends settings the product can actually adopt (v4.18.1).
 *      The constants are not independent: the strong ceiling sits strictly
 *      above the noise gate, which sits above LOW_SCORE_FLOOR. The first
 *      version did not know that and recommended a setting that fails
 *      check-scale on sight. See the note in lib/match-label.ts for what breaks
 *      and how it announces itself.
 *   4. It scores what is SHOWN, not only what is decided (v4.19.1). The first
 *      calibration raised verdict accuracy from 21/35 to 25/35 and, in the same
 *      move, cut the share of expected records reaching the reader from 96% to
 *      72% — the page more often right about whether something exists while
 *      naming less of what exists. The headline number did not twitch. The
 *      listing floor is now swept as its own dimension and chosen on that.
 *
 * It changes nothing. It prints a recommendation; moving the floors is an edit
 * to lib/match-label.ts that a human makes after reading this output.
 *
 * Run: npm run tune-gold
 *      npm run tune-gold -- --all   (also print the full 1-D sweeps)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { toClientRecord } from "../lib/client-records";
import { loadDataset } from "../lib/dataset";
import { datasetFingerprint, type GoldFile } from "../lib/gold";
import { DEFAULT_THRESHOLDS, assessOverlap, type OverlapThresholds, type OverlapVerdict } from "../lib/overlap";
import { retrieve } from "../lib/retrieval";
import type { ClientScoredResult } from "../lib/types";

const showAll = process.argv.includes("--all");

const gold = JSON.parse(readFileSync(resolve(process.cwd(), "data/gold-queries.json"), "utf8")) as GoldFile;
const dataset = loadDataset(gold.written_against.dataset_variant === "pre" ? "pre" : "post");

const fingerprint = datasetFingerprint(dataset);
if (fingerprint !== gold.written_against.fingerprint) {
  console.error(
    `The corpus has changed since these questions were written (${gold.written_against.fingerprint} → ${fingerprint}).\n` +
      "Tuning against stale expectations would produce a confident wrong threshold. See lib/gold.ts."
  );
  process.exit(1);
}
if (gold.queries.some((q) => !q.embedding)) {
  console.error("Questions have no vectors yet. Run `npm run embed-gold` first.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Retrieve once per question. Retrieval does not depend on the thresholds, so
// the sweep re-grades cached results rather than re-ranking 182 records 20,000
// times over.
// ---------------------------------------------------------------------------

interface Case {
  id: string;
  expected: OverlapVerdict;
  expectedRecords: string[];
  ideas: ClientScoredResult[];
  solutions: ClientScoredResult[];
}

const cases: Case[] = gold.queries.map((q) => {
  const outcome = retrieve(dataset, q.embedding as number[], { topDirect: 8 });
  return {
    id: q.id,
    expected: q.expect.verdict,
    expectedRecords: q.expect.records,
    ideas: outcome.ideas.map((r) => ({ ...r, record: toClientRecord(r.record) })),
    solutions: outcome.solutions.map((r) => ({ ...r, record: toClientRecord(r.record) })),
  };
});

const CLASSES: OverlapVerdict[] = ["exists", "already-asked", "related", "clear"];
const total = Object.fromEntries(CLASSES.map((c) => [c, cases.filter((x) => x.expected === c).length])) as Record<
  OverlapVerdict,
  number
>;

interface Score {
  correct: number;
  byClass: Record<OverlapVerdict, number>;
  /** Mean share of each question's expected records that actually reached the reader. */
  shown: number;
}

function scoreAt(t: OverlapThresholds): Score {
  const byClass = Object.fromEntries(CLASSES.map((c) => [c, 0])) as Record<OverlapVerdict, number>;
  let correct = 0;
  let shownSum = 0;
  let shownN = 0;
  for (const c of cases) {
    const r = assessOverlap(c.ideas, c.solutions, t);
    if (r.verdict === c.expected) {
      correct++;
      byClass[c.expected]++;
    }
    // `clear` questions expect no records, so they would score a vacuous 1.
    if (c.expectedRecords.length) {
      const ids = new Set([...r.solutions, ...r.ideas].map((m) => m.record.id));
      shownSum += c.expectedRecords.filter((id) => ids.has(id)).length / c.expectedRecords.length;
      shownN++;
    }
  }
  return { correct, byClass, shown: shownN ? shownSum / shownN : 1 };
}

// Thresholds are swept in hundredths as integers: 0.1 + 0.2 !== 0.3 is not a
// bug worth debugging inside a triple loop.
const cents = (n: number) => Math.round(n * 100);
const dec = (c: number) => c / 100;

const base = scoreAt(DEFAULT_THRESHOLDS);
console.log("");
console.log(`Tuning against ${cases.length} gold questions, corpus ${fingerprint}`);
console.log(
  `Today: noMatch ${DEFAULT_THRESHOLDS.noMatchTopScore} · related ${DEFAULT_THRESHOLDS.related} · strong ${DEFAULT_THRESHOLDS.strong}` +
    `  →  ${base.correct}/${cases.length}` +
    `  (${CLASSES.map((c) => `${c} ${base.byClass[c]}/${total[c]}`).join(", ")})`
);


// ---------------------------------------------------------------------------
// 1-D sweeps. Each knob alone, with the others where they are today, printed
// only where the answer changes: the points at which a number starts to matter
// are the whole content of a sweep.
// ---------------------------------------------------------------------------

type Knob = "gate" | "strong" | "listing";

function at(knob: Knob, v: number): OverlapThresholds {
  if (knob === "gate") return { ...DEFAULT_THRESHOLDS, noMatchTopScore: v };
  if (knob === "strong") return { ...DEFAULT_THRESHOLDS, strong: v };
  return { ...DEFAULT_THRESHOLDS, related: v };
}

function sweep1D(knob: Knob, label: string, from: number, to: number) {
  console.log(`\n${label}:`);
  const rows: string[] = [];
  let prev = "";
  for (let c = cents(from); c <= cents(to); c++) {
    const t = at(knob, dec(c));
    if (t.strong <= t.noMatchTopScore || t.related > t.noMatchTopScore) continue;
    const s = scoreAt(t);
    const key = knob === "listing" ? s.shown.toFixed(3) : String(s.correct);
    if (showAll || key !== prev) {
      rows.push(
        `  ${dec(c).toFixed(2)}  ${String(s.correct).padStart(2)}/${cases.length}   ` +
          CLASSES.map((k) => `${k} ${s.byClass[k]}/${total[k]}`).join("  ") +
          `   shown ${(s.shown * 100).toFixed(0)}%`
      );
      prev = key;
    }
  }
  console.log(rows.join("\n"));
}

sweep1D("gate", "the noise gate — decides `clear`, and only records above it set a verdict", 0.3, 0.7);
sweep1D("strong", "the strong ceiling — decides `exists` against `related`", 0.45, 0.85);
sweep1D(
  "listing",
  "the listing floor — cannot change a verdict, only how much of the answer is shown",
  0.15,
  0.6
);

// ---------------------------------------------------------------------------
// Joint sweep.
//
// Two knobs decide verdicts: the gate and the strong ceiling. The listing floor
// is swept as a third dimension but judged on a different thing — see v4.19.1
// in lib/overlap.ts. Only records at or above the gate can set a verdict, so
// the listing floor cannot move the score; what it moves is how much of a
// correct answer reaches the reader, which the first calibration lost 24% of
// without the headline number twitching.
// ---------------------------------------------------------------------------

interface Point extends OverlapThresholds {
  correct: number;
  byClass: Record<OverlapVerdict, number>;
  shown: number;
}

const points: Point[] = [];
for (let gate = cents(0.3); gate <= cents(0.7); gate++) {
  for (let st = cents(0.45); st <= cents(0.85); st++) {
    if (st <= gate) continue; // strictly above, or `related` is unreachable
    for (let lf = cents(0.15); lf <= gate; lf += 2) {
      const t = { noMatchTopScore: dec(gate), related: dec(lf), strong: dec(st) };
      points.push({ ...t, ...scoreAt(t) });
    }
  }
}

const best = Math.max(...points.map((p) => p.correct));

/**
 * The guard was fixed before the sweep ran, so the sweep cannot be accused of
 * having chosen it afterwards: `clear` must reach at least 6 of 7, and `exists`
 * must not fall below the 15 of 17 it got at the original floors. A setting
 * that wins on total by trading away the verdict that prevents duplicate builds
 * is not a win.
 */
const GUARD = (p: Point) => p.byClass.clear >= 6 && p.byClass.exists >= 15;
const guarded = points.filter(GUARD);
const guardedBest = guarded.length ? Math.max(...guarded.map((p) => p.correct)) : -1;

function summarise(label: string, pool: Point[], hi: number): Point | null {
  if (!pool.length) {
    console.log(`\n${label}: nothing satisfies it.`);
    return null;
  }
  const span = (f: (p: Point) => number) =>
    `${Math.min(...pool.map(f)).toFixed(2)}–${Math.max(...pool.map(f)).toFixed(2)}`;

  // Verdicts first, then how much of the answer is shown, and only then the
  // middle of what is left. Ordering these is the whole judgement: a setting
  // that is right more often but says less is not obviously better, and saying
  // which one wins out loud beats burying it in a sort comparator.
  const bestShown = Math.max(...pool.map((p) => p.shown));
  let shownPool = pool.filter((p) => p.shown >= bestShown - 1e-9);

  /**
   * Among settings that show everything they can, take the HIGHEST listing
   * floor, not the lowest.
   *
   * Recall alone is a degenerate objective for this knob: a floor of zero lists
   * every retrieved record and therefore scores perfectly, while burying the
   * answer in near-misses. The gold set measures what should be shown and not
   * what should not, so the counterweight is a rule rather than a metric —
   * show everything the questions ask for, and nothing further down than that
   * requires. The tightest list that still says it all.
   */
  const tightest = Math.max(...shownPool.map((p) => p.related));
  shownPool = shownPool.filter((p) => p.related >= tightest - 1e-9);

  const mean = (f: (p: Point) => number) => shownPool.reduce((a, p) => a + f(p), 0) / shownPool.length;
  const centre = { gate: mean((p) => p.noMatchTopScore), strong: mean((p) => p.strong) };
  const dist = (p: Point) =>
    Math.abs(p.noMatchTopScore - centre.gate) + Math.abs(p.strong - centre.strong);
  const pick = [...shownPool].sort((a, b) => dist(a) - dist(b))[0];

  console.log(`\n${label}: ${hi}/${cases.length}, reached by ${pool.length} settings`);
  console.log(
    `  plateau spans   gate ${span((p) => p.noMatchTopScore)} · strong ${span((p) => p.strong)} · listing ${span((p) => p.related)}`
  );
  console.log(
    `  middle of it    gate ${pick.noMatchTopScore.toFixed(2)} · strong ${pick.strong.toFixed(2)} · listing ${pick.related.toFixed(2)}`
  );
  console.log(
    `  by class        ${CLASSES.map((c) => `${c} ${pick.byClass[c]}/${total[c]}`).join(", ")}   shown ${(pick.shown * 100).toFixed(0)}%`
  );
  return pick;
}

const rawPick = summarise("Best on total verdicts", points.filter((p) => p.correct === best), best);
const pick = summarise(
  "Best that also satisfies the guard (clear ≥ 6/7, exists ≥ 15/17)",
  guarded.filter((p) => p.correct === guardedBest),
  guardedBest
);

// ---------------------------------------------------------------------------
// How much of this is real, and what to type.
// ---------------------------------------------------------------------------

console.log("");
if (pick) {
  const plateau = guarded.filter((p) => p.correct === guardedBest).length;
  console.log(
    plateau >= 20
      ? `The winning setting is not a spike: ${plateau} settings reach it, so the boundary is a region rather than a fitted number.`
      : `Only ${plateau} settings reach the maximum. That is a narrow plateau — treat the recommendation as provisional and widen the gold set before trusting the exact value.`
  );
  if (rawPick && rawPick.correct > pick.correct) {
    console.log(
      `Ignoring the guard would score ${rawPick.correct}/${cases.length}, ${rawPick.correct - pick.correct} higher, by giving up on clear or exists. Not recommended.`
    );
  }

  const changes: string[] = [];
  const line = (name: string, now: number, was: number) =>
    Math.abs(now - was) > 1e-9 ? `  ${name.padEnd(23)} = ${now}   (was ${was})` : null;
  const a = line("NO_MATCH_TOPSCORE_FLOOR", pick.noMatchTopScore, DEFAULT_THRESHOLDS.noMatchTopScore);
  const b = line("MIN_ABS_FOR_RELATED", pick.related, DEFAULT_THRESHOLDS.related);
  const c = line("MIN_ABS_FOR_STRONG", pick.strong, DEFAULT_THRESHOLDS.strong);
  for (const l of [a, b, c]) if (l) changes.push(l);

  console.log("");
  if (!changes.length) {
    console.log("No change recommended: today's floors already reach the best guarded score.");
  } else {
    console.log("To adopt, edit lib/match-label.ts:");
    console.log(changes.join("\n"));
    console.log("");
    console.log(
      "Then: npm run check-gold (it will fail against the old baseline, which is the\n" +
        "point of a baseline), npm run check-scale (the scale's zones are these same\n" +
        "constants), npm run build."
    );
  }
}

console.log("");
console.log(
  `Caveat, and it is not boilerplate: this is ${cases.length} questions against ${dataset.ideas.length + dataset.solutions.length} synthetic records.\n` +
    "It is enough to show that a floor of 0.30 is wrong, because 0/7 is not a sampling\n" +
    "artefact. It is not enough to justify a third decimal place."
);

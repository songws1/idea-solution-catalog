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
 * compute the boundary from ground truth instead of choosing it. Two things
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
  ideas: ClientScoredResult[];
  solutions: ClientScoredResult[];
}

const cases: Case[] = gold.queries.map((q) => {
  const outcome = retrieve(dataset, q.embedding as number[], { topDirect: 8 });
  return {
    id: q.id,
    expected: q.expect.verdict,
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
}

function scoreAt(t: OverlapThresholds): Score {
  const byClass = Object.fromEntries(CLASSES.map((c) => [c, 0])) as Record<OverlapVerdict, number>;
  let correct = 0;
  for (const c of cases) {
    if (assessOverlap(c.ideas, c.solutions, t).verdict === c.expected) {
      correct++;
      byClass[c.expected]++;
    }
  }
  return { correct, byClass };
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
// 1-D sweeps: what one floor does with the other two held where they are.
// Easier to read than the joint grid, and it shows whether a floor matters.
// ---------------------------------------------------------------------------

function sweep1D(name: keyof OverlapThresholds, from: number, to: number) {
  console.log(`\n${name}, others at today's values:`);
  const rows: string[] = [];
  let prev = -1;
  for (let c = cents(from); c <= cents(to); c++) {
    const t = { ...DEFAULT_THRESHOLDS, [name]: dec(c) };
    const s = scoreAt(t);
    // Print only where the answer changes, unless --all: 36 identical lines
    // teach nothing, and the points where a number starts to matter are the
    // whole content of a sweep.
    if (showAll || s.correct !== prev) {
      rows.push(
        `  ${dec(c).toFixed(2)}  ${String(s.correct).padStart(2)}/${cases.length}   ` +
          CLASSES.map((k) => `${k} ${s.byClass[k]}/${total[k]}`).join("  ")
      );
      prev = s.correct;
    }
  }
  console.log(rows.join("\n"));
}

sweep1D("noMatchTopScore", 0.3, 0.7);
sweep1D("related", 0.3, 0.7);
sweep1D("strong", 0.45, 0.85);

// ---------------------------------------------------------------------------
// Joint sweep.
// ---------------------------------------------------------------------------

interface Point extends OverlapThresholds {
  correct: number;
  byClass: Record<OverlapVerdict, number>;
}

const points: Point[] = [];
for (let nm = cents(0.3); nm <= cents(0.7); nm++) {
  for (let rel = cents(0.3); rel <= cents(0.7); rel++) {
    for (let st = cents(0.45); st <= cents(0.85); st++) {
      if (st < rel) continue; // "covers it" cannot be a lower bar than "worth listing"
      const t = { noMatchTopScore: dec(nm), related: dec(rel), strong: dec(st) };
      const s = scoreAt(t);
      points.push({ ...t, ...s });
    }
  }
}

const best = Math.max(...points.map((p) => p.correct));
const optimal = points.filter((p) => p.correct === best);

/**
 * The guard agreed before the sweep ran, so the sweep cannot be accused of
 * having chosen it afterwards: `clear` must reach at least 6 of 7, and `exists`
 * must not fall below the 15 of 17 it gets today. A setting that wins on total
 * by trading away the verdict that prevents duplicate builds is not a win.
 */
const GUARD = (p: Point) => p.byClass.clear >= 6 && p.byClass.exists >= 15;
const guarded = points.filter(GUARD);
const guardedBest = guarded.length ? Math.max(...guarded.map((p) => p.correct)) : -1;
const guardedOptimal = guarded.filter((p) => p.correct === guardedBest);

function summarise(label: string, pool: Point[], hi: number) {
  if (!pool.length) {
    console.log(`\n${label}: nothing satisfies it.`);
    return null;
  }
  // The middle of the plateau, not its edge. Rounded to a hundredth, and pulled
  // back to the nearest member if the centroid itself is not on the plateau
  // (the region need not be convex).
  const mean = (f: (p: Point) => number) => pool.reduce((a, p) => a + f(p), 0) / pool.length;
  const centre = {
    noMatchTopScore: dec(Math.round(cents(mean((p) => p.noMatchTopScore)))),
    related: dec(Math.round(cents(mean((p) => p.related)))),
    strong: dec(Math.round(cents(mean((p) => p.strong)))),
  };
  const dist = (p: Point) =>
    Math.abs(p.noMatchTopScore - centre.noMatchTopScore) +
    Math.abs(p.related - centre.related) +
    Math.abs(p.strong - centre.strong);
  const pick = [...pool].sort((a, b) => dist(a) - dist(b))[0];
  const span = (f: (p: Point) => number) =>
    `${Math.min(...pool.map(f)).toFixed(2)}–${Math.max(...pool.map(f)).toFixed(2)}`;

  console.log(`\n${label}: ${hi}/${cases.length}, reached by ${pool.length} settings`);
  console.log(
    `  plateau spans   noMatch ${span((p) => p.noMatchTopScore)} · related ${span((p) => p.related)} · strong ${span((p) => p.strong)}`
  );
  console.log(
    `  middle of it    noMatch ${pick.noMatchTopScore.toFixed(2)} · related ${pick.related.toFixed(2)} · strong ${pick.strong.toFixed(2)}`
  );
  console.log(`  by class        ${CLASSES.map((c) => `${c} ${pick.byClass[c]}/${total[c]}`).join(", ")}`);
  return pick;
}

const rawPick = summarise("Best on total verdicts", optimal, best);
const centre = summarise("Best that also satisfies the guard (clear ≥ 6/7, exists ≥ 15/17)", guardedOptimal, guardedBest);

/**
 * Do not move a number that does not need to move.
 *
 * The plateau is usually wide in at least one dimension, because the floors
 * overlap in effect: once `related` is high enough that no record is listed,
 * the verdict is `clear` whatever `noMatchTopScore` says, so that dimension
 * stops mattering and the middle of its range is an invented value. Changing a
 * committed threshold for no measured gain is churn, and it costs the next
 * reader an explanation that does not exist.
 *
 * So each floor is checked on its own: hold the other two at the chosen
 * setting, find the values of this one that still reach the maximum, and keep
 * today's value if it is among them. Only a floor that has to move, moves.
 */
function minimalChange(from: OverlapThresholds, target: number): OverlapThresholds {
  const keys: Array<keyof OverlapThresholds> = ["noMatchTopScore", "related", "strong"];
  const out: OverlapThresholds = { ...from };
  for (const k of keys) {
    const span = [0.3, 0.85];
    const keeps: number[] = [];
    for (let c = cents(span[0]); c <= cents(span[1]); c++) {
      const t = { ...out, [k]: dec(c) };
      if (t.strong < t.related) continue;
      const s = scoreAt(t);
      if (s.correct === target && GUARD({ ...t, ...s } as Point)) keeps.push(dec(c));
    }
    if (!keeps.length) continue;
    const today = DEFAULT_THRESHOLDS[k];
    out[k] = keeps.some((v) => Math.abs(v - today) < 1e-9)
      ? today
      : keeps[Math.floor(keeps.length / 2)];
  }
  return out;
}

let pick: (OverlapThresholds & { byClass: Record<OverlapVerdict, number>; correct: number }) | null = null;
if (centre) {
  const minimal = minimalChange(centre, guardedBest);
  const s = scoreAt(minimal);
  // Dimensions were relaxed one at a time, so confirm the combination still
  // holds before recommending it; if it does not, the centre of the plateau
  // stands.
  const ok = s.correct === guardedBest && GUARD({ ...minimal, ...s } as Point);
  pick = ok ? { ...minimal, ...s } : centre;
  const kept = (["noMatchTopScore", "related", "strong"] as const).filter(
    (k) => Math.abs(pick![k] - DEFAULT_THRESHOLDS[k]) < 1e-9
  );
  console.log(
    `\nSmallest change that reaches ${guardedBest}/${cases.length}:` +
      `  noMatch ${pick.noMatchTopScore.toFixed(2)} · related ${pick.related.toFixed(2)} · strong ${pick.strong.toFixed(2)}`
  );
  if (kept.length) {
    console.log(`  unchanged from today: ${kept.join(", ")} — the sweep gives no reason to move ${kept.length > 1 ? "them" : "it"}.`);
  }
}

// ---------------------------------------------------------------------------
// How much of this is real.
// ---------------------------------------------------------------------------

console.log("");
if (pick) {
  const wide = guardedOptimal.length >= 20;
  console.log(
    wide
      ? `The winning setting is not a spike: ${guardedOptimal.length} settings reach it, so the boundary is a region rather than a fitted number.`
      : `Only ${guardedOptimal.length} settings reach the maximum. That is a narrow plateau — treat the recommendation as provisional and widen the gold set before trusting the exact value.`
  );
  if (rawPick && rawPick.correct > (pick?.correct ?? 0)) {
    console.log(
      `Ignoring the guard would score ${rawPick.correct}/${cases.length}, ${rawPick.correct - (pick?.correct ?? 0)} higher, by giving up on clear or exists. Not recommended.`
    );
  }
  console.log("");
  const changes: string[] = [];
  if (Math.abs(pick.noMatchTopScore - DEFAULT_THRESHOLDS.noMatchTopScore) > 1e-9)
    changes.push(`  NO_MATCH_TOPSCORE_FLOOR = ${pick.noMatchTopScore}   (was ${DEFAULT_THRESHOLDS.noMatchTopScore})`);
  if (Math.abs(pick.related - DEFAULT_THRESHOLDS.related) > 1e-9)
    changes.push(`  MIN_ABS_FOR_RELATED     = ${pick.related}   (was ${DEFAULT_THRESHOLDS.related})`);
  if (Math.abs(pick.strong - DEFAULT_THRESHOLDS.strong) > 1e-9)
    changes.push(`  MIN_ABS_FOR_STRONG      = ${pick.strong}   (was ${DEFAULT_THRESHOLDS.strong})`);
  if (changes.length === 0) {
    console.log("No change recommended: today's floors already reach the best guarded score.");
  } else {
    console.log("To adopt, edit lib/match-label.ts:");
    console.log(changes.join("\n"));
  }
  console.log("");
  console.log(
    "Then: npm run check-gold (it will fail against the old baseline, which is the\n" +
      "point of a baseline), npm run check-scale (the zones on the similarity scale\n" +
      "are these same constants, so the picture moves with them), npm run build."
  );
}

console.log("");
console.log(
  `Caveat, and it is not boilerplate: this is ${cases.length} questions against ${dataset.ideas.length + dataset.solutions.length} synthetic records.\n` +
    "It is enough to show that a floor of 0.30 is wrong, because 0/7 is not a sampling\n" +
    "artefact. It is not enough to justify a third decimal place."
);

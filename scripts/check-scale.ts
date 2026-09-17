/**
 * Offline verification for the similarity scale in the verdict (v4.14).
 *
 * The scale makes one promise: the verdict written above it always agrees with
 * where the dots are. If that ever breaks, the picture is not decoration that
 * went slightly wrong, it is the page contradicting itself. So this drives the
 * real pipeline (retrieve → assessOverlap → buildScale) with no API key and no
 * spend, over enough queries to reach all four verdicts many times each.
 *
 * The queries: every record's own embedding, plus that embedding diluted toward
 * deterministic noise at four strengths (the same technique check-fixture.ts
 * uses to produce "related" and "clear" payloads). 182 records × 5 = 910.
 *
 * Run: npm run check-scale
 */
import { loadDataset } from "../lib/dataset";
import { toClientRecord } from "../lib/client-records";
import { retrieve } from "../lib/retrieval";
import { assessOverlap, findTwicePair, type OverlapVerdict } from "../lib/overlap";
import {
  LOW_SCORE_FLOOR,
  MIN_ABS_FOR_RELATED,
  MIN_ABS_FOR_STRONG,
} from "../lib/match-label";
import { SCALE_GEOMETRY, ZONES, buildScale, xOf, zoneOf } from "../lib/similarity-scale";
import type { ClientScoredResult } from "../lib/types";

const dataset = loadDataset("post");

let failures = 0;
function check(label: string, pass: boolean, detail = "") {
  console.log(`${pass ? "OK  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

function noise(dim: number, seed: number): number[] {
  let x = seed;
  const out = Array.from({ length: dim }, () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296 - 0.5;
  });
  const norm = Math.hypot(...out);
  return out.map((v) => v / norm);
}

function dilute(a: number[], w: number, seed: number): number[] {
  const n = noise(a.length, seed);
  const out = a.map((v, i) => v * w + n[i] * (1 - w));
  const norm = Math.hypot(...out);
  return out.map((v) => v / norm);
}

// 1. The zones are the verdict's constants, not a copy of them.
check(
  "zone lines are the match-label.ts floors",
  ZONES[0].from === 0 &&
    ZONES[0].to === LOW_SCORE_FLOOR &&
    ZONES[1].from === LOW_SCORE_FLOOR &&
    ZONES[1].to === MIN_ABS_FOR_RELATED &&
    ZONES[2].from === MIN_ABS_FOR_RELATED &&
    ZONES[2].to === MIN_ABS_FOR_STRONG &&
    ZONES[3].from === MIN_ABS_FOR_STRONG &&
    ZONES[3].to === 1,
  ZONES.map((z) => `${z.key} ${z.from}-${z.to}`).join(", ")
);

const verdictCounts: Record<OverlapVerdict, number> = {
  exists: 0,
  "already-asked": 0,
  related: 0,
  clear: 0,
};
const broken: Record<string, string[]> = {
  promise: [],
  clearZone: [],
  viaLink: [],
  coverage: [],
  pair: [],
  nearest: [],
  position: [],
  bounds: [],
};
let overlaps = 0;
let dotsTotal = 0;
let pairsDrawn = 0;
let nearestDrawn = 0;

const records = [...dataset.ideas, ...dataset.solutions];
records.forEach((rec, k) => {
  for (const w of [1, 0.5, 0.32, 0.22, 0.12]) {
    const embedding = w === 1 ? rec.embedding : dilute(rec.embedding, w, k + 1);
    const outcome = retrieve(dataset, embedding, { topDirect: 8 });
    const ideas: ClientScoredResult[] = outcome.ideas.map((r) => ({
      ...r,
      record: toClientRecord(r.record),
    }));
    const solutions: ClientScoredResult[] = outcome.solutions.map((r) => ({
      ...r,
      record: toClientRecord(r.record),
    }));
    const result = assessOverlap(ideas, solutions);
    const scale = buildScale({ ideas, solutions, result });
    const tag = `${rec.id}@${w}`;
    verdictCounts[result.verdict]++;
    dotsTotal += scale.dots.length;

    // 2. The promise. Re-derived from the dots alone, never from the verdict.
    const topSolution = Math.max(0, ...scale.dots.filter((d) => d.kind === "solution").map((d) => d.score));
    const topOpenIdea = Math.max(0, ...scale.dots.filter((d) => d.kind === "idea-open").map((d) => d.score));
    const topEligible = Math.max(topSolution, topOpenIdea);
    const expected: OverlapVerdict =
      topSolution >= MIN_ABS_FOR_STRONG
        ? "exists"
        : topOpenIdea >= MIN_ABS_FOR_STRONG
          ? "already-asked"
          : topEligible >= MIN_ABS_FOR_RELATED
            ? "related"
            : "clear";
    if (expected !== result.verdict) broken.promise.push(`${tag} dots say ${expected}, verdict ${result.verdict}`);
    if (result.verdict !== "clear" && scale.activeZone !== zoneOf(topEligible)) {
      broken.promise.push(`${tag} highlighted ${scale.activeZone}, top eligible ${topEligible}`);
    }

    // 3. On clear, the highlighted zone follows the headline's own split.
    if (result.verdict === "clear") {
      const headlineNearMiss = result.topScore >= LOW_SCORE_FLOOR;
      const zoneNearMiss = scale.activeZone !== "noise";
      if (headlineNearMiss !== zoneNearMiss) {
        broken.clearZone.push(`${tag} topScore ${result.topScore}, zone ${scale.activeZone}`);
      }
    }

    // 4. No via_link dot; every direct hit drawn exactly once.
    const direct = [...outcome.ideas, ...outcome.solutions].filter((h) => !h.via_link);
    const viaIds = new Set(
      [...outcome.ideas, ...outcome.solutions].filter((h) => h.via_link).map((h) => h.record.id)
    );
    if (scale.dots.some((d) => viaIds.has(d.id))) broken.viaLink.push(tag);
    const counts = new Map<string, number>();
    scale.dots.forEach((d) => counts.set(d.id, (counts.get(d.id) ?? 0) + 1));
    if (direct.length !== scale.dots.length || direct.some((h) => counts.get(h.record.id) !== 1)) {
      broken.coverage.push(`${tag} ${direct.length} direct, ${scale.dots.length} dots`);
    }

    // 5. The arc names the sentence's pair; the nearest label names the proof's record.
    const pair = findTwicePair(result);
    if (pair) {
      const bothDrawn = counts.has(pair[0].id) && counts.has(pair[1].id);
      const same = scale.twicePair?.[0] === pair[0].id && scale.twicePair?.[1] === pair[1].id;
      if (bothDrawn !== same) broken.pair.push(tag);
      if (!bothDrawn) broken.pair.push(`${tag} pair named in the sentence is not on the scale`);
      if (same) pairsDrawn++;
    } else if (scale.twicePair) {
      broken.pair.push(`${tag} arc with no sentence`);
    }
    const proofShown = result.verdict === "clear" && result.topScore >= LOW_SCORE_FLOOR && result.nearest;
    if (proofShown && scale.nearestId !== result.nearest!.id) {
      broken.nearest.push(`${tag} proof names ${result.nearest!.id}, scale marks ${scale.nearestId}`);
    }
    if (!proofShown && scale.nearestId) broken.nearest.push(`${tag} nearest marked with no proof sentence`);
    if (scale.nearestId) nearestDrawn++;

    // 6. Positions are the truth: x is exactly the score, the dot stays in the
    //    drawing and in its own lane. Overlaps are counted, not forbidden:
    //    three scores within a pixel of each other can only share space.
    const g = SCALE_GEOMETRY;
    for (const d of scale.dots) {
      if (d.x !== xOf(d.score)) broken.position.push(`${tag} ${d.id}`);
      const lane = d.kind === "solution" ? g.solutionLane : g.ideaLane;
      if (
        d.x - d.r < 0 ||
        d.x + d.r > g.width ||
        Math.abs(d.y - lane) > 24 ||
        d.y - d.r < g.zoneTop ||
        d.y + d.r > g.zoneBottom
      ) {
        broken.bounds.push(`${tag} ${d.id}`);
      }
    }
    for (let i = 0; i < scale.dots.length; i++) {
      for (let j = i + 1; j < scale.dots.length; j++) {
        const a = scale.dots[i];
        const b = scale.dots[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r) overlaps++;
      }
    }
  }
});

const report = (key: string, label: string) =>
  check(label, broken[key].length === 0, broken[key].length ? broken[key].slice(0, 3).join("; ") : "");

report("promise", "the verdict always matches the zone of the highest dot that can set it");
report("clearZone", "on clear, the highlighted zone follows the nowhere-near / near-miss split");
report("viaLink", "no via_link record is drawn");
report("coverage", "every direct hit is drawn exactly once");
report("pair", "the arc and the built-twice sentence always name the same pair");
report("nearest", "the nearest label marks exactly the record the proof sentence names");
report("position", "every dot sits exactly at its score");
report("bounds", "every dot stays inside the drawing and its lane");

// 7. Not vacuous: every verdict, the arc and the nearest label were exercised.
check(
  "every verdict was exercised",
  Object.values(verdictCounts).every((n) => n > 0),
  Object.entries(verdictCounts).map(([k, n]) => `${k} ${n}`).join(", ")
);
check("the built-twice arc was exercised", pairsDrawn > 0, `${pairsDrawn} arcs`);
check("the nearest label was exercised", nearestDrawn > 0, `${nearestDrawn} labels`);

console.log(
  `\ninfo: ${records.length * 5} queries, ${dotsTotal} dots, ${overlaps} overlapping pairs after slotting`
);
console.log(failures === 0 ? "\nSCALE CHECKS: ALL PASS" : `\nSCALE CHECKS: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);

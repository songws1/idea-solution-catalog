import {
  LOW_SCORE_FLOOR,
  MIN_ABS_FOR_RELATED,
  MIN_ABS_FOR_STRONG,
} from "./match-label";
import { findTwicePair, recordName, type OverlapResult } from "./overlap";
import type { ClientIdea, ClientScoredResult } from "./types";

/**
 * The similarity scale in the verdict (v4.14) — geometry and meaning, no React.
 *
 * The verdict is a judgement stated in words. UAT on v4.10 and v4.11 kept
 * arriving at the same complaint from different directions: a reader could not
 * tell a near miss from a clear win, or an accurate "no" from a broken search,
 * because a sentence carries the conclusion and none of the evidence. This
 * draws the verdict's own decision rule and puts every result on it, so the
 * zone the highest dot lands in IS the verdict, visibly.
 *
 * Everything that decides what is drawn lives here rather than in the
 * component, so scripts/check-scale.ts can hold the picture to the one promise
 * it makes: the verdict above it always agrees with where the dots are.
 *
 * What is plotted, and why:
 *
 *   - Every DIRECT hit in the /api/check payload. No new call; the board is
 *     drawn from the same sets. `via_link` records are left off: retrieval
 *     gives them their partner's score (lib/retrieval.ts join), so each would
 *     sit exactly on top of another dot, showing a score it never earned.
 *
 *   - Solutions on a lane above the axis, ideas below. "Built, or only asked
 *     for?" is the verdict's first question, so it gets a row, not just a colour.
 *
 *   - Solved ideas ARE plotted, muted. The verdict ignores them (a solved idea is
 *     represented by its solution), so they never count toward the active zone.
 *     But on a clear verdict the proof sentence can name one as the nearest
 *     record, and a record named in prose has to be on the picture to click.
 *
 * Zones are the three floors from lib/match-label.ts. There is deliberately no
 * gap marker: the mockup had one, and it needed a "how big is a big gap"
 * threshold picked by eye, which is a second scale by another name. The spacing
 * between dots already shows the gap.
 */

export type ZoneKey = "noise" | "loose" | "related" | "strong";

export interface Zone {
  key: ZoneKey;
  label: string;
  from: number;
  to: number;
  /**
   * False when the zone is too narrow to carry its own word (v4.19).
   *
   * The v4.19 calibration put `related` between 0.52 and 0.54, which is 14
   * pixels of a 720-pixel scale. "related 0.52" drawn there does not sit in its
   * zone, it lies across the next one, and a label pointing at the wrong band is
   * worse than no label: the legend and the numbers on the boundaries still say
   * everything the word did. So a narrow zone keeps its boundary value and drops
   * its name. scripts/check-scale.ts asserts no drawn label overflows its zone.
   */
  showLabel: boolean;
}

/**
 * Roughly the width one zone label needs, in SVG user units. Measured against
 * the longest word plus its boundary value at the size globals.css draws them;
 * a couple of units either way changes nothing, since the only judgement it
 * makes is "does the word fit at all".
 */
const LABEL_WIDTH = 58;

function zone(key: ZoneKey, label: string, from: number, to: number): Zone {
  return { key, label, from, to, showLabel: (to - from) * SCALE_GEOMETRY_WIDTH >= LABEL_WIDTH };
}

/** Kept separate from SCALE_GEOMETRY below only because ZONES is built first. */
const SCALE_GEOMETRY_WIDTH = 720 - 14 * 2;

/** The four zones, bounded by the constants the verdict itself uses. */
export const ZONES: Zone[] = [
  zone("noise", "noise", 0, LOW_SCORE_FLOOR),
  zone("loose", "loose", LOW_SCORE_FLOOR, MIN_ABS_FOR_RELATED),
  zone("related", "related", MIN_ABS_FOR_RELATED, MIN_ABS_FOR_STRONG),
  zone("strong", "strong", MIN_ABS_FOR_STRONG, 1),
];

export function zoneOf(score: number): ZoneKey {
  if (score >= MIN_ABS_FOR_STRONG) return "strong";
  if (score >= MIN_ABS_FOR_RELATED) return "related";
  if (score >= LOW_SCORE_FLOOR) return "loose";
  return "noise";
}

/** Drawing size in SVG user units. The SVG scales; these only fix proportions. */
export const SCALE_GEOMETRY = {
  width: 720,
  height: 172,
  padX: 14,
  /** Baseline of the zone names, above the zones so no dot can sit on one. */
  labelRow: 13,
  zoneTop: 26,
  zoneBottom: 146,
  solutionLane: 56,
  axis: 86,
  ideaLane: 116,
  /**
   * Vertical slots tried, in order, when a dot would land on another: a small
   * beeswarm. Slots sit 12 apart, just more than two radii plus a margin, so
   * neighbouring slots never collide with each other. Measured over the
   * check-scale sweep: with this, 93% of specific descriptions (top score about
   * 0.7) draw no overlapping dots at all. What overlap remains is concentrated
   * in vague descriptions where eight scores fall inside a 0.03 band below
   * 0.15, i.e. in the noise zone, where no single dot matters. It is drawn
   * highest-score-on-top, and every dot stays reachable by keyboard.
   */
  slots: [0, -12, 12, -24, 24],
} as const;

export type DotKind = "solution" | "idea-open" | "idea-built";

export interface ScaleDot {
  id: string;
  name: string;
  kind: DotKind;
  score: number;
  /** Exact position of the score. Never nudged sideways: a nudge across a zone
      line would draw a dot in a zone its score is not in. */
  x: number;
  y: number;
  r: number;
  /** Solutions and unsolved ideas — the records the verdict is graded on. */
  canSetVerdict: boolean;
  /** Rank by score across all dots, 0 = highest. Drives focus order and motion. */
  rank: number;
}

export interface Scale {
  zones: Zone[];
  activeZone: ZoneKey;
  dots: ScaleDot[];
  /** The v4.9.2 near-duplicate pair, when both are on the scale. */
  twicePair: [string, string] | null;
  /** The record the clear verdict's proof sentence names, when it names one. */
  nearestId: string | null;
  /** One sentence for screen readers. */
  summary: string;
}

export function xOf(score: number): number {
  const { width, padX } = SCALE_GEOMETRY;
  const clamped = Math.max(0, Math.min(1, score));
  return padX + clamped * (width - padX * 2);
}

const RADIUS: Record<DotKind, number> = {
  solution: 5.5,
  "idea-open": 5,
  "idea-built": 4,
};

export function buildScale(input: {
  ideas: ClientScoredResult[];
  solutions: ClientScoredResult[];
  result: OverlapResult;
}): Scale {
  const { ideas, solutions, result } = input;
  const g = SCALE_GEOMETRY;

  const raw = [
    ...solutions
      .filter((r) => !r.via_link)
      .map((r) => ({ r, kind: "solution" as DotKind, lane: g.solutionLane })),
    ...ideas
      .filter((r) => !r.via_link)
      .map((r) => ({
        r,
        kind: ((r.record as ClientIdea).status === "solved" ? "idea-built" : "idea-open") as DotKind,
        lane: g.ideaLane,
      })),
  ].sort((a, b) => b.r.score - a.r.score);

  // Place highest first, so when slots run out it is the lower-ranked dot that
  // gives way. Only vertical slots within the lane are used (see ScaleDot.x).
  const placed: ScaleDot[] = [];
  raw.forEach(({ r, kind, lane }, rank) => {
    const x = xOf(r.score);
    const radius = RADIUS[kind];
    const clearance = (y: number) =>
      Math.min(
        Infinity,
        ...placed
          .filter((p) => Math.abs(p.y - lane) <= 24)
          .map((p) => Math.hypot(p.x - x, p.y - y) - (p.r + radius + 1.5))
      );
    let bestY: number = lane;
    let best = -Infinity;
    for (const offset of g.slots) {
      const c = clearance(lane + offset);
      if (c >= 0) {
        bestY = lane + offset;
        best = c;
        break;
      }
      if (c > best) {
        best = c;
        bestY = lane + offset;
      }
    }
    placed.push({
      id: r.record.id,
      name: recordName(r.record),
      kind,
      score: r.score,
      x,
      y: bestY,
      r: radius,
      canSetVerdict: kind !== "idea-built",
      rank,
    });
  });

  const eligibleTop = Math.max(0, ...placed.filter((d) => d.canSetVerdict).map((d) => d.score));
  const overallTop = Math.max(0, ...placed.map((d) => d.score));

  // On a clear verdict the headline splits on the overall top score (v4.10:
  // "nowhere near" below LOW_SCORE_FLOOR, "not close enough" above it), and
  // that can be a solved idea. The highlighted zone follows the headline.
  const activeZone = zoneOf(result.verdict === "clear" ? overallTop : eligibleTop);

  const pair = findTwicePair(result);
  const ids = new Set(placed.map((d) => d.id));
  const twicePair =
    pair && ids.has(pair[0].id) && ids.has(pair[1].id)
      ? ([pair[0].id, pair[1].id] as [string, string])
      : null;

  const nearestId =
    result.verdict === "clear" &&
    result.topScore >= LOW_SCORE_FLOOR &&
    result.nearest &&
    ids.has(result.nearest.id)
      ? result.nearest.id
      : null;

  const inStrong = placed.filter((d) => d.canSetVerdict && d.score >= MIN_ABS_FOR_STRONG).length;
  const summary =
    placed.length === 0
      ? "No results to place on the scale."
      : `${placed.length} results placed on a similarity scale from 0 to 1. ` +
        `${inStrong} ${inStrong === 1 ? "is" : "are"} in the strong zone. ` +
        `The highest is ${overallTop.toFixed(2)}, in the ${zoneOf(overallTop)} zone.`;

  return { zones: ZONES, activeZone, dots: placed, twicePair, nearestId, summary };
}

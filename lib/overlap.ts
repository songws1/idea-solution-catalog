import {
  LOW_SCORE_FLOOR,
  MIN_ABS_FOR_RELATED,
  MIN_ABS_FOR_STRONG,
  NO_MATCH_TOPSCORE_FLOOR,
} from "./match-label";
import type { ClientIdea, ClientRecord, ClientScoredResult, ClientSolution } from "./types";

/**
 * "Before you build" overlap check.
 *
 * The catalog's whole reason for existing is that 7000 people should not build
 * the same thing twice. Search alone does not deliver that: it only helps the
 * person who already thought to look, and nobody searches a catalog they have
 * not remembered exists. The moment of leverage is when someone is about to
 * start — so this takes a description of the thing they intend to build and
 * answers one question: does it already exist?
 *
 * The distinction that makes it useful is between two kinds of overlap, which
 * ordinary search flattens into one ranked list:
 *
 *   - a built SOLUTION overlaps  → the thing exists, go and get it
 *   - an open or in-progress IDEA overlaps → somebody already asked for this,
 *     so join their request instead of filing a second one
 *
 * Thresholds are imported from lib/match-label.ts rather than re-picked here.
 * A second similarity scale calibrated by eye would quietly disagree with the
 * labels on the board, and one of the two would be wrong.
 */

export type OverlapVerdict =
  /** A built solution already covers this closely. */
  | "exists"
  /** Nothing built, but an open or in-progress idea already asks for it. */
  | "already-asked"
  /** Related work exists but nothing that plainly covers it. */
  | "related"
  /** Nothing in the catalog is close. */
  | "clear";

export interface OverlapMatch {
  record: ClientRecord;
  score: number;
  /** Why this record is in the answer, in the reader's terms. */
  relation: "built" | "asked" | "related";
}

export interface OverlapResult {
  verdict: OverlapVerdict;
  /** Built solutions that cover, or nearly cover, the description. */
  solutions: OverlapMatch[];
  /** Unsolved ideas asking for the same thing. */
  ideas: OverlapMatch[];
  /** Highest similarity seen anywhere, for the explainer. */
  topScore: number;
  /**
   * The closest record even when nothing qualified (v4.10).
   *
   * A `clear` verdict returns no matches, which is correct, and used to leave
   * the reader unable to tell an accurate "no" from a broken search. Naming the
   * nearest thing is the cheapest possible proof that the question was read and
   * compared: "the closest record is X, and it is not close" says both halves.
   *
   * Deliberately not a match and never rendered as a tile. v4.7 established
   * that a tile on a ranked board reads as a match whatever its label says, so
   * this stays prose.
   */
  nearest: { id: string; name: string; org: string; score: number } | null;
}

/**
 * The pair behind "this has been built twice" / "two requests already ask for
 * this" (v4.9.2), or null.
 *
 * Lifted out of VerdictBlock in v4.14 because two things now depend on it: the
 * sentence, and the arc the similarity scale draws between the same two dots.
 * If each ran its own search they could one day disagree about which pair, and
 * the picture would contradict the words directly above it.
 *
 * Only on `exists` and `already-asked`, and only among the records the verdict
 * rests on, in the order the sentence has always named them.
 */
export function findTwicePair(result: OverlapResult): [ClientRecord, ClientRecord] | null {
  if (result.verdict !== "exists" && result.verdict !== "already-asked") return null;
  const matches = [...result.solutions, ...result.ideas].map((m) => m.record);
  for (let i = 0; i < matches.length; i++) {
    for (let j = i + 1; j < matches.length; j++) {
      if (matches[i].duplicate_candidates.some((c) => c.id === matches[j].id)) {
        return [matches[i], matches[j]];
      }
    }
  }
  return null;
}

/** Display name of any client record: an idea's title, a solution's name. */
export function recordName(record: ClientRecord): string {
  return record.doc_type === "idea"
    ? (record as ClientIdea).title
    : (record as ClientSolution).name;
}

/** Ideas that are still open questions — a solved idea is represented by its solution. */
function isUnsolved(record: ClientIdea): boolean {
  return record.status !== "solved";
}

/**
 * The three absolute floors this grading rests on.
 *
 * They live in lib/match-label.ts and are imported, not re-picked: a second
 * similarity scale calibrated by eye would quietly disagree with the labels on
 * the board, and one of the two would be wrong.
 */
export interface OverlapThresholds {
  /** Below this top score the whole result set is noise (`NO_MATCH_TOPSCORE_FLOOR`). */
  noMatchTopScore: number;
  /** Below this a record is not worth listing at all (`MIN_ABS_FOR_RELATED`). */
  related: number;
  /** At or above this a record covers the description (`MIN_ABS_FOR_STRONG`). */
  strong: number;
}

export const DEFAULT_THRESHOLDS: OverlapThresholds = {
  noMatchTopScore: NO_MATCH_TOPSCORE_FLOOR,
  related: MIN_ABS_FOR_RELATED,
  strong: MIN_ABS_FOR_STRONG,
};

/**
 * Grade a retrieval result into a verdict.
 *
 * `exists` deliberately requires a DIRECT solution hit at the "strong" floor.
 * A solution pulled in by the cross-reference join (`via_link`) is present
 * because its paired idea matched, not because it matched — telling someone
 * "this already exists" on that basis would be a confident wrong answer, which
 * is the one failure this feature cannot afford.
 *
 * The `thresholds` parameter exists for exactly one caller: scripts/tune-gold.ts,
 * which asks "what would this have answered at a different setting" across the
 * gold query set. It defaults to the committed floors, and the app never passes
 * it. The alternative was a tuner with its own copy of this grading, which would
 * eventually drift from the real thing and recommend a threshold for a rule the
 * page does not follow.
 */
export function assessOverlap(
  ideas: ClientScoredResult[],
  solutions: ClientScoredResult[],
  thresholds: OverlapThresholds = DEFAULT_THRESHOLDS
): OverlapResult {
  const { noMatchTopScore, related: relatedFloor, strong: strongFloor } = thresholds;
  const topScore = Math.max(
    0,
    ...ideas.map((r) => r.score),
    ...solutions.map((r) => r.score)
  );

  /**
   * The closest record of any kind, whether or not it qualifies as a match.
   * Only rendered on a `clear` verdict; the others have real matches to show.
   *
   * Direct hits only (v4.14). A `via_link` record carries its partner's score
   * rather than one of its own, so on a tie it could be named "nearest" when it
   * never matched at all. It also needs an id now: the similarity scale draws
   * the nearest record as a dot and has to open the right one when clicked.
   */
  const all = [...ideas, ...solutions]
    .filter((r) => !r.via_link)
    .sort((a, b) => b.score - a.score);
  const best = all[0];
  const nearest = best
    ? {
        id: best.record.id,
        name:
          best.record.doc_type === "idea"
            ? (best.record as ClientIdea).title
            : (best.record as ClientSolution).name,
        org: best.record.doc_type === "idea" ? (best.record as ClientIdea).org : "",
        score: best.score,
      }
    : null;

  // Below the whole-set noise floor nothing here means anything (§3).
  if (topScore < noMatchTopScore) {
    return { verdict: "clear", solutions: [], ideas: [], topScore, nearest };
  }

  const directSolutions = solutions
    .filter((r) => !r.via_link && r.score >= relatedFloor)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const openIdeas = ideas
    .filter(
      (r) =>
        !r.via_link &&
        r.score >= relatedFloor &&
        r.record.doc_type === "idea" &&
        isUnsolved(r.record as ClientIdea)
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const builtCovers = directSolutions.some((r) => r.score >= strongFloor);
  const askedFor = openIdeas.some((r) => r.score >= strongFloor);

  const verdict: OverlapVerdict = builtCovers
    ? "exists"
    : askedFor
      ? "already-asked"
      : directSolutions.length > 0 || openIdeas.length > 0
        ? "related"
        : "clear";

  return {
    verdict,
    topScore,
    nearest,
    solutions: directSolutions.map((r) => ({
      record: r.record,
      score: r.score,
      relation: r.score >= strongFloor ? "built" : "related",
    })),
    ideas: openIdeas.map((r) => ({
      record: r.record,
      score: r.score,
      relation: r.score >= strongFloor ? "asked" : "related",
    })),
  };
}

/** Headline and next step per verdict — the page's whole point is the next step. */
export const VERDICT_COPY: Record<
  OverlapVerdict,
  { headline: string; action: string }
> = {
  exists: {
    headline: "This may already be built.",
    action: "Talk to its owner before you start. Extending theirs usually beats a second build.",
  },
  "already-asked": {
    headline: "Someone has already asked for this.",
    action: "Add your case to their request rather than filing a second one.",
  },
  related: {
    headline: "Nothing covers this, but there is related work.",
    action: "Worth a word with the owners below before you start.",
  },
  clear: {
    headline: "Nothing in the catalog is close to this.",
    action:
      "Go ahead. Record it when you build it, so the next person asking this question finds you.",
  },
};

/**
 * A `clear` verdict, split by how far away the nearest record actually was
 * (v4.10).
 *
 * Light UAT showed the real failure was not that the catalog said "no", it was
 * that a reader could not tell an accurate "no" from a broken search. One
 * sentence covered both a description of a Christmas party and one that landed
 * just under the bar, which are completely different situations and want
 * completely different next moves.
 *
 * The boundary is LOW_SCORE_FLOOR, already defined in lib/match-label.ts as the
 * point below which a score is noise rather than a weak match. Reused rather
 * than re-picked: a second number chosen by eye here would eventually disagree
 * with the labels on the board.
 */
export function clearCopy(result: OverlapResult): {
  headline: string;
  action: string;
  proof: string | null;
} {
  const nearMiss = result.topScore >= LOW_SCORE_FLOOR;
  if (!nearMiss) {
    return {
      headline: "Nothing in the catalog is anywhere near this.",
      action: "Go ahead. Record it when you build it, so the next person finds you.",
      proof: null,
    };
  }
  return {
    headline: "Nothing here is close enough to act on.",
    action: "Go ahead, and record it when you build it.",
    proof: result.nearest
      ? `The nearest record is “${result.nearest.name}”, and it is not a match — it is in the same territory at most.`
      : null,
  };
}

export interface CheckApiResponse {
  description?: string;
  result?: OverlapResult;
  /** Short explanation of the overlap, or null when synthesis was skipped. */
  explanation?: string | null;
  /**
   * The full ranked sets behind the verdict (v4.6). One question now produces
   * two layers of answer: the verdict above, and the whole board re-ranked and
   * match-labelled below. Retrieval already computed these, so returning them
   * costs nothing and removes the need for a second text box and a second
   * paid round trip.
   */
  ideas?: ClientScoredResult[];
  solutions?: ClientScoredResult[];
  error?: string;
}

export type { ClientIdea, ClientSolution };

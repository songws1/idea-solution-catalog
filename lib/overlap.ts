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
  nearest: { name: string; org: string; score: number } | null;
}

/** Ideas that are still open questions — a solved idea is represented by its solution. */
function isUnsolved(record: ClientIdea): boolean {
  return record.status !== "solved";
}

/**
 * Grade a retrieval result into a verdict.
 *
 * `exists` deliberately requires a DIRECT solution hit at the "strong" floor.
 * A solution pulled in by the cross-reference join (`via_link`) is present
 * because its paired idea matched, not because it matched — telling someone
 * "this already exists" on that basis would be a confident wrong answer, which
 * is the one failure this feature cannot afford.
 */
export function assessOverlap(
  ideas: ClientScoredResult[],
  solutions: ClientScoredResult[]
): OverlapResult {
  const topScore = Math.max(
    0,
    ...ideas.map((r) => r.score),
    ...solutions.map((r) => r.score)
  );

  /**
   * The closest record of any kind, whether or not it qualifies as a match.
   * Only rendered on a `clear` verdict; the others have real matches to show.
   */
  const all = [...ideas, ...solutions].sort((a, b) => b.score - a.score);
  const best = all[0];
  const nearest = best
    ? {
        name:
          best.record.doc_type === "idea"
            ? (best.record as ClientIdea).title
            : (best.record as ClientSolution).name,
        org: best.record.doc_type === "idea" ? (best.record as ClientIdea).org : "",
        score: best.score,
      }
    : null;

  // Below the whole-set noise floor nothing here means anything (§3).
  if (topScore < NO_MATCH_TOPSCORE_FLOOR) {
    return { verdict: "clear", solutions: [], ideas: [], topScore, nearest };
  }

  const directSolutions = solutions
    .filter((r) => !r.via_link && r.score >= MIN_ABS_FOR_RELATED)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const openIdeas = ideas
    .filter(
      (r) =>
        !r.via_link &&
        r.score >= MIN_ABS_FOR_RELATED &&
        r.record.doc_type === "idea" &&
        isUnsolved(r.record as ClientIdea)
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const builtCovers = directSolutions.some((r) => r.score >= MIN_ABS_FOR_STRONG);
  const askedFor = openIdeas.some((r) => r.score >= MIN_ABS_FOR_STRONG);

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
      relation: r.score >= MIN_ABS_FOR_STRONG ? "built" : "related",
    })),
    ideas: openIdeas.map((r) => ({
      record: r.record,
      score: r.score,
      relation: r.score >= MIN_ABS_FOR_STRONG ? "asked" : "related",
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
    action:
      "The closest build is first in the Solution column below. Take the artifact, or talk to its owner before you start — if it does not quite fit, extending theirs is usually cheaper than a second build.",
  },
  "already-asked": {
    headline: "Someone has already asked for this.",
    action:
      "The request is in the columns below. Add your case to it instead of filing a second one — two requests for the same thing compete for the same build slot.",
  },
  related: {
    headline: "Nothing covers this, but there is related work.",
    action:
      "The closest records are below. Worth a conversation with their owners: they may have solved a piece of it, or hit something you would rather find out now.",
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
      action:
        "Go ahead. Record it when you build it, so the next person asking this question finds you.",
      proof: null,
    };
  }
  return {
    headline: "Nothing here is close enough to act on.",
    action:
      "Close enough to be worth a second look before you start, but nothing that covers it. Go ahead, and record it when you build it.",
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

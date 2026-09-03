/**
 * Match-quality labels for search results — presentation-layer only
 * (Addendum A §3). Cosine similarity from text-embedding-3-small compresses
 * into a range that does not map to a 0-1 intuition (a strong match showed
 * 0.68, a real secondary match 0.42), so a result is labeled relative to the
 * top score actually returned rather than against a fixed universal threshold.
 *
 * Consumers: ResultCard.tsx (§3) today; the shared card-detail component,
 * Kanban cards, and graph view in later phases — the scale is deliberately
 * shared so there is one visual language, not one encoding per view.
 */

export type MatchLabel = "Strong match" | "Related" | "Loosely related";

/** Below this absolute cosine similarity a result is noise, not a weak match. */
const LOW_SCORE_FLOOR = 0.15;

/**
 * Absolute floors per tier, on top of the relative (score vs. topScore)
 * thresholds. Bug found in UAT: on a weak/noisy result set (e.g. a query
 * with no real matches, topScore ~0.16), the pure-relative math labels
 * several near-identical low scores "Strong match" just because they sit
 * close to a topScore that is itself barely above the noise floor — a
 * confident-sounding label on a result set that is actually noise. These
 * floors are calibrated from the live retrieval tests in Addendum A §0
 * (real strong matches: 0.58-0.74; real secondary/related matches:
 * 0.39-0.55; cross-org noise and unrelated queries: well under 0.35).
 */
const MIN_ABS_FOR_STRONG = 0.5;
const MIN_ABS_FOR_RELATED = 0.3;

/**
 * Label a single score relative to the top score in its result set, gated
 * by an absolute floor per tier so a weak/noisy result set can't produce a
 * false "Strong match" purely from relative math. Returns null when no
 * label should be shown — score below the noise floor, or a degenerate
 * result set with no positive top score.
 */
export function matchLabel(score: number, topScore: number): MatchLabel | null {
  if (!Number.isFinite(score) || topScore <= 0) return null;
  if (score < LOW_SCORE_FLOOR) return null;
  if (score >= topScore * 0.9 && score >= MIN_ABS_FOR_STRONG) return "Strong match";
  if (score >= topScore * 0.65 && score >= MIN_ABS_FOR_RELATED) return "Related";
  return "Loosely related";
}

/** Highest score in a result set (ideas + solutions combined), or 0 if empty. */
export function topScoreOf(scores: number[]): number {
  return scores.reduce((max, s) => (s > max ? s : max), 0);
}

/**
 * Below this topScore, nothing in the result set is a real match — treat the
 * whole set as empty rather than showing individually-labeled but
 * meaningless cards. Found in UAT: a query like "cooking" against this
 * catalog tops out around 0.16, while the weakest genuinely-relevant match
 * seen in live testing (Addendum A §0) was 0.39-0.42. 0.3 sits comfortably
 * between the two. This is a whole-result-set check, distinct from the
 * per-item tier floors above — a real query can legitimately include a
 * "Loosely related" card (or a via-link cross-reference inheriting a real
 * direct hit's score) sitting well above this bar; this bar only catches
 * the case where even the single best result is noise.
 */
export const NO_MATCH_TOPSCORE_FLOOR = 0.3;

/** True when at least one result in the set is a real match, not noise. */
export function hasAnyRealMatch(topScore: number): boolean {
  return topScore >= NO_MATCH_TOPSCORE_FLOOR;
}

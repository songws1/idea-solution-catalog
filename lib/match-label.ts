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
export const LOW_SCORE_FLOOR = 0.15;

/**
 * Absolute floors per tier, on top of the relative (score vs. topScore)
 * thresholds. Bug found in UAT: on a weak/noisy result set (e.g. a query
 * with no real matches, topScore ~0.16), the pure-relative math labels
 * several near-identical low scores "Strong match" just because they sit
 * close to a topScore that is itself barely above the noise floor — a
 * confident-sounding label on a result set that is actually noise. These
 * floors are now also imported by lib/overlap.ts, so the "before you build"
 * check grades overlap on exactly the same scale the board labels use — a
 * second scale picked by eye would quietly disagree with the first.
 *
 * CALIBRATION (v4.19). These were 0.5 and 0.3, picked by eye from the live
 * retrieval tests in Addendum A §0, where a query was a record's own text and
 * scores ran high (real strong matches 0.58-0.74, noise under 0.35). The gold
 * query set showed that distribution is not the one the product sees. A person
 * types a short sentence, not a record, and against 35 hand-written questions
 * nothing scored above 0.83 while unrelated questions reached 0.504 — so a
 * "nothing here" bar at 0.30 never fired once in seven chances to fire.
 *
 * These values now come from `npm run tune-gold`, which sweeps the real
 * grading over the gold set. Do not adjust them by hand: re-run the sweep,
 * read its plateau, and take what it says.
 *
 *   measured, by expected verdict, top score per question:
 *     clear    0.395 - 0.504      related  0.481 - 0.635
 *     exists   0.576 - 0.773      asked    0.526 - 0.827
 *
 * Note what that says about `related`: it overlaps both of its neighbours, so
 * no absolute band can hold it. "Related but not the same thing" is a semantic
 * property and this is a magnitude scale. The narrow band below is a deliberate
 * acceptance, not a tuning result — see docs/gold-findings.md.
 */
export const MIN_ABS_FOR_STRONG = 0.54;
export const MIN_ABS_FOR_RELATED = 0.3;

/**
 * WHAT EACH NUMBER IS FOR, since two of them were doing one job until v4.19.1
 * and the difference cost real answers.
 *
 *   NO_MATCH_TOPSCORE_FLOOR — the gate. Can this result set decide anything?
 *   MIN_ABS_FOR_STRONG      — the ceiling. Does this record COVER the request?
 *   MIN_ABS_FOR_RELATED     — the listing floor. Is this record worth showing
 *                             beside an answer, and worth a "Related" label?
 *
 * The constraint, learned by breaking it twice:
 *
 *   LOW_SCORE_FLOOR < NO_MATCH_TOPSCORE_FLOOR < MIN_ABS_FOR_STRONG
 *
 * The similarity scale (v4.14) draws NO_MATCH_TOPSCORE_FLOOR as the line
 * between "nothing here" and "related", and only records above it may set the
 * verdict. Violate the left-hand side and dots land in the Related band on a
 * page whose verdict says nothing is close; violate the right-hand side and the
 * `related` verdict has no band to live in. check-scale catches both, as "dots
 * say related, verdict clear" and "every verdict was exercised — related 0".
 *
 * MIN_ABS_FOR_RELATED is NOT in that chain. It sits below the gate and only
 * decides what is listed once a verdict exists. v4.19 set it equal to the gate,
 * which held the verdict correct while quietly deleting correct records from
 * correct answers — gold "shown" recall 96% → 72%. See lib/overlap.ts.
 */

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
 * whole set as empty rather than showing individually-labeled but meaningless
 * cards.
 *
 * This is the gate, and the similarity scale draws it. See the constraint note
 * above for what it must stay between.
 *
 * It was 0.3, chosen because "cooking" topped out at 0.16 and the weakest real
 * match seen in early testing was 0.39. That reasoning was sound and the
 * evidence was wrong: it came from queries that were records. Against 35
 * questions a person would actually type, unrelated ones reach 0.504, so 0.3
 * cleared nothing and the `clear` verdict was dead — 0 correct out of 7. At
 * 0.52 it is 7 out of 7. The cost is two `related` questions (0.481) that now
 * read as clear, which loses a discovery rather than a duplicate-prevention.
 *
 * Provisional: 6 settings reached the maximum, which is a narrow plateau.
 * Widen the gold set before trusting the second decimal.
 */
export const NO_MATCH_TOPSCORE_FLOOR = 0.52;

/** True when at least one result in the set is a real match, not noise. */
export function hasAnyRealMatch(topScore: number): boolean {
  return topScore >= NO_MATCH_TOPSCORE_FLOOR;
}

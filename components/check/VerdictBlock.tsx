import { VERDICT_COPY, type OverlapResult } from "@/lib/overlap";
import type { ClientSolution } from "@/lib/types";
import { isNoteworthy, monthsSince, solutionFreshness } from "@/lib/freshness";

/**
 * The verdict: what to do, and why (v4.7).
 *
 * It used to be followed by a grid of up to six "match cards" showing the
 * overlapping records. Those went, because they were the board again. The
 * cards were chosen as the top three solutions and top three ideas by score,
 * and the board is sorted by that same score, so the two sets were not merely
 * similar — the code guaranteed the cards were the board's own first tiles,
 * rendered a second time with less on them (no tags, no "Resolves" cross-link,
 * no duplicate flag).
 *
 * Worse, on a `related` verdict the page said "nothing covers this" and then
 * laid out six records underneath, which reads as a contradiction rather than
 * as evidence.
 *
 * So the answer is now two parts with no overlap between them: this, which
 * states the judgement in words, and the board below, which is the evidence
 * and the only place a record is drawn.
 */
export default function VerdictBlock({
  result,
  explanation,
}: {
  result: OverlapResult;
  explanation: string | null;
}) {
  const copy = VERDICT_COPY[result.verdict];

  /**
   * The caution that matters most (v4.8).
   *
   * "This already exists, go and get it" is the single most consequential
   * sentence this app produces, and it is the one that goes wrong quietly: the
   * reader trusts it, takes the artifact, finds it no longer runs, and stops
   * trusting the catalog. So when the verdict rests on a record nobody has
   * confirmed in a long time, that has to be said in the same breath as the
   * verdict, not left on a card further down for the reader to notice.
   *
   * Only on `exists`. On `related` the page is already telling someone to go
   * and talk to a human, so age is context rather than a warning.
   */
  const caution = (() => {
    if (result.verdict !== "exists") return null;
    const top = result.solutions[0]?.record;
    if (!top || top.doc_type !== "solution") return null;
    const sol = top as ClientSolution;
    const state = solutionFreshness(sol);
    if (!isNoteworthy(state)) return null;
    const months = monthsSince(sol.date_last_reviewed);
    return state === "unreviewed"
      ? "Worth knowing: nobody has confirmed that build still works since it was written. Ask its owner before you drop your own plan."
      : `Worth knowing: nobody has confirmed that build still works in ${Math.round(
          months ?? 0
        )} months. Ask its owner before you drop your own plan.`;
  })();

  return (
    <section className={`verdict v-${result.verdict}`} aria-live="polite">
      <h2>{copy.headline}</h2>
      <p className="verdict-action">{copy.action}</p>
      {explanation && <p className="verdict-explain">{explanation}</p>}
      {caution && <p className="verdict-caution">{caution}</p>}
    </section>
  );
}

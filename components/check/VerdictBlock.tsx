import { VERDICT_COPY, type OverlapResult } from "@/lib/overlap";

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

  return (
    <section className={`verdict v-${result.verdict}`} aria-live="polite">
      <h2>{copy.headline}</h2>
      <p className="verdict-action">{copy.action}</p>
      {explanation && <p className="verdict-explain">{explanation}</p>}
    </section>
  );
}

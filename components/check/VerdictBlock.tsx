import { VERDICT_COPY, clearCopy, type OverlapResult } from "@/lib/overlap";
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
  /**
   * `clear` splits in two (v4.10): "nothing anywhere near this" and "nothing
   * close enough to act on" are different situations that used to share one
   * sentence, and the second one carries proof that the question was actually
   * read and compared. See clearCopy in lib/overlap.ts.
   */
  const isClear = result.verdict === "clear";
  const cleared = isClear ? clearCopy(result) : null;
  const copy = cleared ?? VERDICT_COPY[result.verdict];

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
      : `Worth knowing: nobody has confirmed that build still works for ${Math.round(
          months ?? 0
        )} months. Ask its owner before you drop your own plan.`;
  })();

  /**
   * "This has already been built twice" (v4.9.2).
   *
   * The strongest sentence this catalog can produce, and until now it was only
   * visible on the governance page. When the records the verdict rests on are
   * flagged as near-duplicates OF EACH OTHER, the answer is not "someone built
   * this" — it is "two teams built this separately and neither knew", which
   * changes what the reader should do. They are not choosing whether to reuse
   * one build; they are about to become the third team, and the person to talk
   * to is whoever owns the overlap rather than either owner alone.
   *
   * Surfaced from `duplicate_candidates`, which detection already wrote offline.
   * No new computation, no extra call — the finding was sitting in the payload
   * unread.
   */
  const alreadyTwice = (() => {
    if (result.verdict !== "exists" && result.verdict !== "already-asked") return null;
    const matches = [...result.solutions, ...result.ideas].map((m) => m.record);
    for (let i = 0; i < matches.length; i++) {
      for (let j = i + 1; j < matches.length; j++) {
        const a = matches[i];
        const b = matches[j];
        if (!a.duplicate_candidates.some((c) => c.id === b.id)) continue;
        const nameOf = (r: typeof a): string =>
          r.doc_type === "idea" ? r.title : (r as ClientSolution).name;
        return result.verdict === "exists"
          ? `This has been built twice already: “${nameOf(a)}” and “${nameOf(b)}” are flagged as near-duplicates of each other. Yours would be the third — worth getting both owners in one conversation rather than picking one.`
          : `Two separate requests already ask for this: “${nameOf(a)}” and “${nameOf(b)}”. Joining one of them splits the case further; the useful move is to get them merged.`;
      }
    }
    return null;
  })();

  return (
    <section className={`verdict v-${result.verdict}`} aria-live="polite">
      <h2>{copy.headline}</h2>
      <p className="verdict-action">{copy.action}</p>
      {cleared?.proof && <p className="verdict-proof">{cleared.proof}</p>}
      {alreadyTwice && <p className="verdict-twice">{alreadyTwice}</p>}
      {explanation && <p className="verdict-explain">{explanation}</p>}
      {caution && <p className="verdict-caution">{caution}</p>}
    </section>
  );
}

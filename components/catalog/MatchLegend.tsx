import MatchHelp from "@/components/search/MatchHelp";

/**
 * What the three match labels mean (v4.11).
 *
 * The board carries a pill on every tile, and until now the only explanation of
 * those pills was the pills themselves. A reader scanning twenty tiles has to
 * infer the scale from the ordering, which works right up until they want to
 * decide whether "Related" is worth opening.
 *
 * Two rules shaped it:
 *
 *   - It uses the real pill markup (.card-score.m-strong / .m-related), not a
 *     drawing of one. A legend that renders its own approximation of the thing
 *     it explains drifts the first time the pill styling changes, and then it
 *     is worse than nothing.
 *   - The third tier is shown greyed and struck through rather than omitted.
 *     "Loosely related" is the one label a reader will never see on this board
 *     — v4.7 cuts those tiles — so leaving it out would explain two labels and
 *     silently leave the missing records unexplained. Shown as absent, it also
 *     answers the "where did the rest go" question the hidden-count line raises.
 *
 * No percentages either. The tiers are graded relative to the best score in
 * THIS result set as well as against an absolute floor (lib/match-label.ts), so
 * a printed number would be comparable between two tiles and meaningless
 * between two searches — the worst kind of precision to offer.
 *
 * No group dividers and no promotion of the top tile: the board's ordering
 * already carries the ranking, and both of those were tried and rejected as
 * restating it in a second visual language.
 *
 * MatchHelp — the long explanation of how the scale works — used to sit down in
 * the board controls, on the far side of the filter bar from anything it
 * explained. It moves in here, because a one-line gloss and the paragraph
 * behind it are one thing, and a reader who wants the second has just read the
 * first.
 */
export default function MatchLegend() {
  return (
    <div className="match-legend" aria-label="What the match labels mean">
      <span className="match-legend-item">
        <span className="card-score m-strong">Strong match</span>
        <span className="match-legend-text">
          reads as the same thing you described — start here
        </span>
      </span>
      <span className="match-legend-item">
        <span className="card-score m-related">Related</span>
        <span className="match-legend-text">same territory — worth reading before you start</span>
      </span>
      <span className="match-legend-item is-absent">
        <span className="card-score m-loose">Loosely related</span>
        <span className="match-legend-text">too far to be useful — not shown here</span>
      </span>
      <MatchHelp />
    </div>
  );
}

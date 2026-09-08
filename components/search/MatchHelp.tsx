/**
 * Plain-language explanation of the match labels and the similarity numbers.
 *
 * The scale is genuinely unintuitive and the app was asking people to trust it
 * without ever saying what it measures: a "Strong match" is graded against the
 * best result in that one search, so the same record can carry different labels
 * for different questions, and the raw number is not a percentage. Rather than
 * hide that, this says it in one short disclosure that stays closed by default.
 *
 * Kept in sync with lib/match-label.ts by hand — if the tiers there change, the
 * wording here has to change with them.
 */
export default function MatchHelp({
  variant = "search",
}: {
  /** "search" explains result labels; "cluster" explains the governance range. */
  variant?: "search" | "cluster";
}) {
  return (
    <details className="match-help">
      <summary>
        {variant === "search"
          ? "What do the match labels mean?"
          : "What does the similarity range mean?"}
      </summary>
      <div className="match-help-body">
        <p>
          Every record and every question is turned into a list of numbers that
          stands for its meaning. The score is how close together two of those
          lists point, from 0 to 1. It is not a percentage, and it does not
          count shared words: &ldquo;invoice dispute&rdquo; and &ldquo;billing
          disagreement&rdquo; score high with no word in common.
        </p>
        {variant === "search" ? (
          <>
            <p>
              Labels are relative to the best result in <em>this</em> search.
              <strong> Strong match</strong> means a record is within about 10%
              of the top result and clears an absolute bar on its own.{" "}
              <strong>Related</strong> is further back but still clearly on
              topic, and <strong>Loosely related</strong> is worth a glance, not
              a click. The same record can carry different labels for different
              questions — that is the point, not a bug.
            </p>
            <p>
              When even the best result is too weak to mean anything, nothing is
              shown at all rather than a page of confident-looking noise.
            </p>
          </>
        ) : (
          <p>
            Here the score compares two records to each other rather than a
            record to a question. The range is the lowest and highest similarity
            between any two members of this cluster, so a narrow high range means
            the records are near-identical and a wide one means the group is held
            together by one close pair. Everything in a cluster is a review
            candidate — nothing has been merged.
          </p>
        )}
      </div>
    </details>
  );
}

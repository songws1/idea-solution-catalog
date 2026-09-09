"use client";

/**
 * The page's one text input (v4.6).
 *
 * It used to sit beside a second search box. Both took free text, embedded it
 * and ranked the same catalog; the only difference was the shape of the answer,
 * and asking a reader to choose between two identical-looking boxes to get the
 * same retrieval was a cost with no benefit. There is one question now, and it
 * produces two layers of answer: the verdict, and the re-ranked board.
 *
 * Presentational only — the parent owns the text and the request, because the
 * same response also drives the board below.
 */

export const MAX_CHECK_CHARS = 1200;

const EXAMPLES = [
  "A tool that reads the AP shared inbox every morning and sorts the mail so the team can clear the day from one list.",
  "Something that reminds us to re-check vendor risk assessments before they expire.",
  "A way to turn meeting notes into a list of who owes what by when.",
];

export default function CheckPanel({
  description,
  onChange,
  onSubmit,
  loading,
  showExamples,
}: {
  description: string;
  onChange: (next: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  loading: boolean;
  showExamples: boolean;
}) {
  return (
    <form className="check-panel" onSubmit={onSubmit}>
      <label className="check-label" htmlFor="check-input">
        What are you planning to build?
      </label>
      <textarea
        id="check-input"
        value={description}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe it the way you would to a colleague: the problem, who it is for, and what it would do."
        rows={5}
        maxLength={MAX_CHECK_CHARS}
      />
      <div className="check-foot">
        <span className="check-count">
          {description.length} / {MAX_CHECK_CHARS}
        </span>
        <button type="submit" disabled={loading || !description.trim()}>
          {loading ? "Checking" : "Check the catalog"}
        </button>
      </div>

      {showExamples && (
        <div className="check-examples">
          <span>Try one:</span>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              type="button"
              className="xlink-chip"
              onClick={() => onChange(ex)}
            >
              {ex.split(" ").slice(0, 5).join(" ")}…
            </button>
          ))}
        </div>
      )}
    </form>
  );
}

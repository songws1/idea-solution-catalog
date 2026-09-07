import type { ClientRecord } from "@/lib/types";

/**
 * Quiet duplicate flag: shows how many same-type records were flagged as
 * similar at build time, expandable to the candidate list. Framing is
 * "flagged for review" — nothing is auto-merged. When onNavigate is given,
 * each listed record becomes a real link using the same jump-to-tile contract
 * as the detail view's duplicate disclosure (Phase 4.1 fix #1).
 */

interface Props {
  record: ClientRecord;
  /** When provided, the listed records become clickable (jump-to-tile contract). */
  onNavigate?: (id: string) => void;
}

export default function DuplicateBadge({ record, onNavigate }: Props) {
  const candidates = record.duplicate_candidates;
  if (candidates.length === 0 && !record.duplicate_of) return null;

  const link = (id: string) =>
    onNavigate ? (
      <button
        type="button"
        className="dup-link"
        onClick={() => onNavigate(id)}
        title="Go to this record"
      >
        {id}
      </button>
    ) : (
      <>{id}</>
    );

  return (
    <details className="dup-details" onClick={(e) => e.stopPropagation()}>
      <summary>
        {candidates.length} similar record{candidates.length === 1 ? "" : "s"} flagged for
        review{record.duplicate_of ? " · confirmed duplicate link" : ""}
      </summary>
      <ul>
        {record.duplicate_of && (
          <li>
            confirmed duplicate of {link(record.duplicate_of)} (human-validated)
          </li>
        )}
        {candidates.map((c) => (
          <li key={c.id}>
            {link(c.id)} — similarity {c.score.toFixed(2)}
          </li>
        ))}
      </ul>
    </details>
  );
}

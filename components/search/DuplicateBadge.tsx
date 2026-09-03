import type { ClientRecord } from "@/lib/types";

/**
 * Quiet duplicate flag: shows how many same-type records were flagged as
 * similar at build time, expandable to the candidate list. Framing is
 * "flagged for review" — nothing is auto-merged.
 */
export default function DuplicateBadge({ record }: { record: ClientRecord }) {
  const candidates = record.duplicate_candidates;
  if (candidates.length === 0 && !record.duplicate_of) return null;

  return (
    <details className="dup-details" onClick={(e) => e.stopPropagation()}>
      <summary>
        {candidates.length} similar record{candidates.length === 1 ? "" : "s"} flagged for
        review{record.duplicate_of ? " · confirmed duplicate link" : ""}
      </summary>
      <ul>
        {record.duplicate_of && (
          <li>
            confirmed duplicate of {record.duplicate_of} (human-validated)
          </li>
        )}
        {candidates.map((c) => (
          <li key={c.id}>
            {c.id} — similarity {c.score.toFixed(2)}
          </li>
        ))}
      </ul>
    </details>
  );
}

import type { ClientRecord } from "@/lib/types";

/**
 * Quiet duplicate flag on a board card (v3 §3.3): a tinted --tint-duplicate
 * strip with a 6px dot and the count, expandable to the candidate list.
 * Framing is "flagged for review" — nothing is auto-merged. Candidates cite
 * the record's TITLE, never its raw id (v3 §2.1: ids live only in the detail
 * drawer's muted line and the CSV export). Each listed record is a real link
 * using the jump-to-tile contract from Phase 4.1 fix #1.
 */

interface Props {
  record: ClientRecord;
  /** Jump-to-tile contract: land on the record's card, never a drawer first. */
  onNavigate: (id: string) => void;
  /** Record id → display title/name, backing the title-not-id rule (§2.1). */
  titleOf: (id: string) => string | undefined;
}

export default function DuplicateBadge({ record, onNavigate, titleOf }: Props) {
  const candidates = record.duplicate_candidates;
  if (candidates.length === 0 && !record.duplicate_of) return null;

  const link = (id: string) => (
    <button
      type="button"
      className="dup-link"
      onClick={() => onNavigate(id)}
      title={titleOf(id) ?? id}
    >
      {titleOf(id) ?? id}
    </button>
  );

  return (
    <details className="dup-strip" onClick={(e) => e.stopPropagation()}>
      <summary>
        <span className="dup-dot" aria-hidden="true" />
        {candidates.length} similar record{candidates.length === 1 ? "" : "s"} flagged
      </summary>
      <ul>
        {record.duplicate_of && (
          <li>{link(record.duplicate_of)} (confirmed duplicate, human-validated)</li>
        )}
        {candidates.map((c) => (
          <li key={c.id}>{link(c.id)} — similarity {c.score.toFixed(2)}</li>
        ))}
      </ul>
    </details>
  );
}

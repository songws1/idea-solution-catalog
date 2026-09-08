import type { BoardItem, ClientIdea, ClientSolution } from "./types";

/**
 * Board ordering for browse mode.
 *
 * Until now the board had no sort at all: cards came out in whatever order the
 * seed script happened to write them, which is stable but meaningless — a
 * reader could not tell whether the top of a column was the newest item, the
 * oldest, or nothing in particular. Browse mode now orders explicitly and says
 * so in the UI.
 *
 * Search mode is deliberately NOT sorted here. There the order IS the answer:
 * the board is ranked by how well each record matches the question, and
 * re-sorting it by date would throw that away.
 */

export type SortKey = "newest" | "oldest" | "title";

export const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  title: "Title A–Z",
};

export const DEFAULT_SORT: SortKey = "newest";

/** The date a record is ordered by: submission for ideas, build for solutions. */
function dateOf(record: ClientIdea | ClientSolution): number {
  const iso =
    record.doc_type === "idea" ? record.submitted_date : record.date_built;
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

function titleOf(record: ClientIdea | ClientSolution): string {
  return record.doc_type === "idea" ? record.title : record.name;
}

/**
 * Sort a copy of the items. Ties break on title so the order is total and
 * therefore stable across renders — two records built the same day should not
 * swap places when React re-renders the column.
 */
export function sortBoardItems(items: BoardItem[], key: SortKey): BoardItem[] {
  const byTitle = (a: BoardItem, b: BoardItem) =>
    titleOf(a.record).localeCompare(titleOf(b.record));

  return [...items].sort((a, b) => {
    if (key === "title") return byTitle(a, b);
    const delta = dateOf(b.record) - dateOf(a.record); // newest first
    if (delta !== 0) return key === "newest" ? delta : -delta;
    return byTitle(a, b);
  });
}

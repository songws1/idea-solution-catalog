"use client";

import { useMemo } from "react";
import type { BoardItem } from "@/lib/types";
import { topScoreOf } from "@/lib/match-label";
import type { SolutionMetaMap } from "@/lib/catalog-filters";
import { buildKanbanColumns } from "@/lib/kanban";
import KanbanCard from "./KanbanCard";

/**
 * The Kanban board (v3 §0/§3.2) — the ONLY layout on `/`, serving both browse
 * (full dataset, no scores) and search (filtered + ranked results, summary +
 * match labels on the same cards; no component swap). Three lifecycle columns:
 * Idea / In progress / Solution; column membership and the one-topic-one-card
 * clustering live in lib/kanban.ts. Collapses to a single scrollable column
 * below the 900px breakpoint (§2.5).
 */

interface Props {
  ideas: BoardItem[];
  solutions: BoardItem[];
  /** Clustering pool (v3 §3.2): all ideas incl. solved — browse mode sets it. */
  clusterPool?: BoardItem[];
  onOpen: (item: BoardItem) => void;
  /** Duplicate-candidate contract: jump to the record's tile, drawer last resort. */
  onJumpToDuplicate: (id: string) => void;
  /** Jump to a record's tile wherever rendered; open its detail otherwise. */
  onNavigate: (id: string) => void;
  /** Resolved service/sub-service per solution id (card footer facets). */
  solutionMeta?: SolutionMetaMap;
  /** Footer facet click: filter by this value (§2.2 third case). */
  onFacetClick: (facet: "orgs" | "services", value: string) => void;
  /** Record id → display title/name (duplicate strips cite titles, not ids — §2.1). */
  titleOf: (id: string) => string | undefined;
}

/** Scroll a rendered tile into view and flash it; fall back to the source card's own detail. */
function jumpToTile(id: string, fallback: () => void) {
  const el = document.querySelector<HTMLElement>(`[data-record-id="${id}"]`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("jump-flash");
    window.setTimeout(() => el.classList.remove("jump-flash"), 1600);
  } else {
    fallback();
  }
}

export default function KanbanResults({
  ideas,
  solutions,
  clusterPool,
  onOpen,
  onJumpToDuplicate,
  onNavigate,
  solutionMeta,
  onFacetClick,
  titleOf,
}: Props) {
  const anyScored = [...ideas, ...solutions].some((r) => r.score !== undefined);
  const topScore = useMemo(
    () => (anyScored ? topScoreOf(ideas.concat(solutions).map((r) => r.score ?? 0)) : undefined),
    [ideas, solutions, anyScored]
  );
  const columns = useMemo(
    () => buildKanbanColumns(ideas, solutions, clusterPool),
    [ideas, solutions, clusterPool]
  );

  return (
    <div className="kanban" data-testid="kanban-view">
      <div className="kanban-columns">
        <section className="kanban-col c-idea" aria-label="Idea">
          <h2>
            Idea
            <span className="count col-count">{columns.ideaColumn.length}</span>
            <span className="kanban-desc">not yet started</span>
          </h2>
          {columns.ideaColumn.length > 0 ? (
            columns.ideaColumn.map((item) => (
              <KanbanCard
                key={item.record.id}
                item={item}
                column="idea"
                topScore={topScore}
                likelySolved={columns.likelySolved[item.record.id]}
                onOpen={onOpen}
                onJumpToDuplicate={onJumpToDuplicate}
                onNavigate={onNavigate}
                onJumpToSolution={(id) => jumpToTile(id, () => onOpen(item))}
                solutionMeta={solutionMeta}
                onFacetClick={onFacetClick}
                titleOf={titleOf}
              />
            ))
          ) : (
            <p className="kanban-none">No ideas to show.</p>
          )}
        </section>

        <section className="kanban-col c-review" aria-label="In progress">
          <h2>
            In progress
            <span className="count col-count">{columns.inProgressColumn.length}</span>
            <span className="kanban-desc">being built</span>
          </h2>
          {columns.inProgressColumn.length > 0 ? (
            columns.inProgressColumn.map((item) => (
              <KanbanCard
                key={item.record.id}
                item={item}
                column="review"
                topScore={topScore}
                likelySolved={columns.likelySolved[item.record.id]}
                onOpen={onOpen}
                onJumpToDuplicate={onJumpToDuplicate}
                onNavigate={onNavigate}
                onJumpToSolution={(id) => jumpToTile(id, () => onOpen(item))}
                solutionMeta={solutionMeta}
                onFacetClick={onFacetClick}
                titleOf={titleOf}
              />
            ))
          ) : (
            <p className="kanban-none">Nothing is being built right now.</p>
          )}
        </section>

        <section className="kanban-col c-solved" aria-label="Solution">
          <h2>
            Solution
            <span className="count col-count">{columns.solutionColumn.length}</span>
            <span className="kanban-desc">already built</span>
          </h2>
          {columns.solutionColumn.length > 0 ? (
            columns.solutionColumn.map((cluster) => (
              <KanbanCard
                key={cluster.key}
                item={cluster.solution}
                column="solution"
                topScore={topScore}
                clusterIdeas={cluster.ideas}
                onOpen={onOpen}
                onJumpToDuplicate={onJumpToDuplicate}
                onNavigate={onNavigate}
                onJumpToSolution={(id) => jumpToTile(id, () => onOpen(cluster.solution))}
                solutionMeta={solutionMeta}
                onFacetClick={onFacetClick}
                titleOf={titleOf}
              />
            ))
          ) : (
            <p className="kanban-none">No solutions to show.</p>
          )}
        </section>
      </div>
    </div>
  );
}

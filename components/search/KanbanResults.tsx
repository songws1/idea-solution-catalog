"use client";

import { useMemo } from "react";
import type { ClientScoredResult } from "@/lib/types";
import { topScoreOf } from "@/lib/match-label";
import { buildKanbanColumns } from "@/lib/kanban";
import KanbanCard from "./KanbanCard";

/**
 * Kanban results view — the default post-search presentation (Addendum A
 * §2.1-§2.3), replacing the retired ResultsPanels/ConnectorLayer view. Three
 * columns populated purely from the /api/search response (no backend change);
 * collapses to a single scrollable column with section headers below the
 * 900px breakpoint that ConnectorLayer used (§2.5).
 */

interface Props {
  ideas: ClientScoredResult[];
  solutions: ClientScoredResult[];
  onOpen: (item: ClientScoredResult) => void;
}

export default function KanbanResults({ ideas, solutions, onOpen }: Props) {
  const topScore = useMemo(
    () => topScoreOf([...ideas, ...solutions].map((r) => r.score)),
    [ideas, solutions]
  );
  const columns = useMemo(() => buildKanbanColumns(ideas, solutions), [ideas, solutions]);

  return (
    <div className="kanban" data-testid="kanban-view">
      <div className="kanban-columns">
        <section className="kanban-col" aria-label="Open ideas">
          <h2>
            Idea
            <span className="count">{columns.ideaColumn.length}</span>
          </h2>
          {columns.ideaColumn.length > 0 ? (
            columns.ideaColumn.map((item) => (
              <KanbanCard
                key={item.record.id}
                item={item}
                topScore={topScore}
                likelySolved={columns.likelySolved[item.record.id]}
                onOpen={onOpen}
                onJumpToSolution={(id) => {
                  const el = document.querySelector<HTMLElement>(`[data-record-id="${id}"]`);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    el.classList.add("jump-flash");
                    window.setTimeout(() => el.classList.remove("jump-flash"), 1600);
                  } else {
                    onOpen(item); // fallback: open this card's own detail
                  }
                }}
              />
            ))
          ) : (
            <p className="kanban-none">No open ideas in these results.</p>
          )}
        </section>

        <section className="kanban-col" aria-label="In progress">
          <h2>
            In progress
            <span className="count">{columns.inProgressColumn.length}</span>
          </h2>
          {columns.inProgressColumn.length > 0 ? (
            columns.inProgressColumn.map((item) => (
              <KanbanCard
                key={item.record.id}
                item={item}
                topScore={topScore}
                likelySolved={columns.likelySolved[item.record.id]}
                onOpen={onOpen}
                onJumpToSolution={(id) => {
                  const el = document.querySelector<HTMLElement>(`[data-record-id="${id}"]`);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    el.classList.add("jump-flash");
                    window.setTimeout(() => el.classList.remove("jump-flash"), 1600);
                  } else {
                    onOpen(item);
                  }
                }}
              />
            ))
          ) : (
            <p className="kanban-none">Nothing being worked in these results.</p>
          )}
        </section>

        <section className="kanban-col" aria-label="Solutions">
          <h2>
            Solution
            <span className="count">{columns.solutionColumn.length}</span>
          </h2>
          {columns.solutionColumn.length > 0 ? (
            columns.solutionColumn.map((cluster) => (
              <KanbanCard
                key={cluster.key}
                item={cluster.solution}
                topScore={topScore}
                clusterIdeas={cluster.ideas}
                onOpen={onOpen}
                onJumpToSolution={(id) => {
                  const el = document.querySelector<HTMLElement>(`[data-record-id="${id}"]`);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    el.classList.add("jump-flash");
                    window.setTimeout(() => el.classList.remove("jump-flash"), 1600);
                  } else {
                    onOpen(cluster.solution);
                  }
                }}
              />
            ))
          ) : (
            <p className="kanban-none">Nothing built yet for these matches.</p>
          )}
        </section>
      </div>
    </div>
  );
}
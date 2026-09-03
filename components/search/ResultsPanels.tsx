"use client";

import { useMemo, useRef, useState } from "react";
import type { DatasetVariant, ClientScoredResult } from "@/lib/types";
import { topScoreOf } from "@/lib/match-label";
import ResultCard from "./ResultCard";
import ConnectorLayer from "./ConnectorLayer";

export interface PanelPair {
  ideaId: string;
  solutionId: string;
}

interface Props {
  ideas: ClientScoredResult[];
  solutions: ClientScoredResult[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  variant: DatasetVariant;
}

export default function ResultsPanels({ ideas, solutions, selectedId, onSelect, variant }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // §3: match-quality labels are computed relative to the top score across the
  // whole result set (ideas + solutions combined), not a fixed threshold.
  const topScore = useMemo(
    () => topScoreOf([...ideas, ...solutions].map((r) => r.score)),
    [ideas, solutions]
  );

  // Cross-reference pairs where both sides are visible in the panels.
  const pairs = useMemo<PanelPair[]>(() => {
    const solutionIds = new Set(solutions.map((r) => r.record.id));
    const ideaIds = new Set(ideas.map((r) => r.record.id));
    const out: PanelPair[] = [];
    for (const idea of ideas) {
      if (idea.record.doc_type !== "idea") continue;
      const linked = idea.record.linked_solution_id;
      if (linked && solutionIds.has(linked)) {
        out.push({ ideaId: idea.record.id, solutionId: linked });
      }
    }
    for (const sol of solutions) {
      if (sol.record.doc_type !== "solution") continue;
      const resolves = sol.record.resolves_idea_id;
      if (resolves && ideaIds.has(resolves) && !out.some((p) => p.ideaId === resolves)) {
        out.push({ ideaId: resolves, solutionId: sol.record.id });
      }
    }
    return out;
  }, [ideas, solutions]);

  const activePair = useMemo<PanelPair | null>(() => {
    if (selectedId) {
      const hit = pairs.find((p) => p.ideaId === selectedId || p.solutionId === selectedId);
      if (hit) return hit;
    }
    if (hoveredId) {
      const hit = pairs.find((p) => p.ideaId === hoveredId || p.solutionId === hoveredId);
      if (hit) return hit;
    }
    return null;
  }, [pairs, selectedId, hoveredId]);

  const activeIds = activePair ? new Set([activePair.ideaId, activePair.solutionId]) : new Set<string>();

  if (ideas.length === 0 && solutions.length === 0) {
    return (
      <div className="empty-state" style={{ marginTop: 28 }}>
        <p>Nothing in the catalog matches that phrasing.</p>
        <p>
          Try different words — the search works on meaning, so describe the
          problem the way the team that built a solution might describe it.
        </p>
      </div>
    );
  }

  return (
    <div className="panels-wrap" ref={wrapRef}>
      <ConnectorLayer containerRef={wrapRef} pair={activePair} />
      <section className="panel" aria-label="Ideas">
        <h2>
          Ideas
          <span className="count">
            {ideas.length} result{ideas.length === 1 ? "" : "s"}
          </span>
        </h2>
        {ideas.map((item) => (
          <ResultCard
            key={item.record.id}
            item={item}
            topScore={topScore}
            selected={selectedId === item.record.id}
            linkedActive={activeIds.has(item.record.id)}
            onSelect={onSelect}
            onHover={setHoveredId}
            variant={variant}
          />
        ))}
      </section>
      <section className="panel" aria-label="Solutions">
        <h2>
          Solutions
          <span className="count">
            {solutions.length} result{solutions.length === 1 ? "" : "s"}
          </span>
        </h2>
        {solutions.map((item) => (
          <ResultCard
            key={item.record.id}
            item={item}
            topScore={topScore}
            selected={selectedId === item.record.id}
            linkedActive={activeIds.has(item.record.id)}
            onSelect={onSelect}
            onHover={setHoveredId}
            variant={variant}
          />
        ))}
      </section>
    </div>
  );
}

/**
 * Kanban grouping for post-search results (Addendum A §2.1-§2.3) — a pure
 * presentation regrouping of the ScoredResult[] already returned by
 * /api/search. No backend change; the cross-reference join reuses the same
 * linked_solution_id / resolves_idea_id fields the retrieval join uses.
 *
 * Column model (§2.2):
 *  - Idea: ideas with status open and no linked_solution_id.
 *  - In progress: ideas with status in_progress.
 *  - Solution: each solution result plus any solved ideas in the result set
 *    that resolve to it, rendered as ONE clustered card.
 *
 * Solved ideas whose linked solution is NOT in the result set are returned in
 * unclusteredSolved (data ready, rendering pending a design decision —
 * deliberately not rendered in this phase).
 */
import type { BoardItem } from "./types";

export interface KanbanSolutionCard {
  key: string;
  solution: BoardItem;
  /** Solved ideas from the result set clustered into this solution card. */
  ideas: BoardItem[];
}

export interface KanbanColumns {
  ideaColumn: BoardItem[];
  inProgressColumn: BoardItem[];
  solutionColumn: KanbanSolutionCard[];
  /**
   * Solved ideas in the result set whose linked solution is not itself in the
   * result set. Not rendered in this phase — see the design note in the build
   * report before implementing a card for them.
   */
  unclusteredSolved: BoardItem[];
  /**
   * "Likely already solved" pointers (§2.3): an idea in the Idea or In
   * progress column whose duplicate_candidates include a solved idea whose
   * linked solution is present in the result set. Reuses existing
   * duplicate_candidates + cross-reference data — no new backend field.
   */
  likelySolved: Record<string, string>; // idea id -> solution card id
}

/**
 * Column membership (v3 §3.2): ideas status "open" → Idea; "in_progress" →
 * In progress; solutions → Solution. A solved idea never gets its own card —
 * it appears as the Resolves line on the solution that resolved it, keeping
 * one topic to one card.
 */
export function buildKanbanColumns(
  ideas: BoardItem[],
  solutions: BoardItem[]
): KanbanColumns {
  const solutionById = new Map(solutions.map((r) => [r.record.id, r]));
  const ideaById = new Map(ideas.map((r) => [r.record.id, r]));

  const ideaColumn: BoardItem[] = [];
  const inProgressColumn: BoardItem[] = [];
  const unclusteredSolved: BoardItem[] = [];

  for (const r of ideas) {
    if (r.record.doc_type !== "idea") continue;
    if (r.record.status === "in_progress") {
      inProgressColumn.push(r);
    } else if (r.record.status === "solved") {
      const linked = r.record.linked_solution_id ?? r.record.solution_link;
      if (!linked || !solutionById.has(linked)) unclusteredSolved.push(r);
    } else if (!r.record.linked_solution_id) {
      ideaColumn.push(r);
    }
  }

  const solutionColumn: KanbanSolutionCard[] = [];
  for (const sol of solutions) {
    if (sol.record.doc_type !== "solution") continue;
    const clusterIdeas: BoardItem[] = [];
    const resolves = sol.record.resolves_idea_id;
    if (resolves) {
      const ideaResult = ideaById.get(resolves);
      if (ideaResult && ideaResult.record.doc_type === "idea" && ideaResult.record.status === "solved") {
        clusterIdeas.push(ideaResult);
      }
    }
    solutionColumn.push({ key: sol.record.id, solution: sol, ideas: clusterIdeas });
  }

  // §2.3 duplicate indicator: idea flagged as similar to a solved idea whose
  // solution is on screen.
  const likelySolved: Record<string, string> = {};
  for (const r of [...ideaColumn, ...inProgressColumn]) {
    if (r.record.doc_type !== "idea") continue;
    for (const cand of r.record.duplicate_candidates) {
      const other = ideaById.get(cand.id);
      if (!other || other.record.doc_type !== "idea") continue;
      if (other.record.status !== "solved") continue;
      const linked = other.record.linked_solution_id ?? other.record.solution_link;
      if (linked && solutionById.has(linked)) {
        likelySolved[r.record.id] = linked;
        break;
      }
    }
  }

  return { ideaColumn, inProgressColumn, solutionColumn, unclusteredSolved, likelySolved };
}
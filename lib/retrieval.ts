import type {
  Dataset,
  IdeaRecord,
  ScoredResult,
  SolutionRecord,
} from "./types";

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export interface RetrieveOptions {
  /** Direct hits kept per panel before the cross-reference join. */
  topDirect?: number;
}

export interface RetrievalOutcome {
  ideas: ScoredResult[];
  solutions: ScoredResult[];
}

function linkedIdOf(record: IdeaRecord | SolutionRecord): string | null {
  return record.doc_type === "idea" ? record.linked_solution_id : record.resolves_idea_id;
}

/**
 * Rank records by cosine similarity to the query embedding, then apply the
 * retrieval-time join: when a chunk is retrieved, its paired document is
 * pulled into the other panel (marked via_link) so results are complete.
 */
export function retrieve(
  dataset: Dataset,
  queryEmbedding: number[],
  opts: RetrieveOptions = {}
): RetrievalOutcome {
  const topDirect = opts.topDirect ?? 8;

  const rankIdeas = dataset.ideas
    .map((record) => ({ record, score: cosineSimilarity(queryEmbedding, record.embedding) }))
    .sort((a, b) => b.score - a.score);
  const rankSolutions = dataset.solutions
    .map((record) => ({ record, score: cosineSimilarity(queryEmbedding, record.embedding) }))
    .sort((a, b) => b.score - a.score);

  const directIdeas = rankIdeas.slice(0, topDirect);
  const directSolutions = rankSolutions.slice(0, topDirect);

  const ideasById = new Map(directIdeas.map((r) => [r.record.id, r]));
  const solutionsById = new Map(directSolutions.map((r) => [r.record.id, r]));

  const joinedSolutions = new Set<string>();
  const joinedIdeas = new Set<string>();

  // Join: solutions paired with directly-hit ideas enter the solutions panel.
  for (const hit of directIdeas) {
    const pairId = linkedIdOf(hit.record);
    if (pairId && !solutionsById.has(pairId)) {
      const paired = dataset.solutions.find((s) => s.id === pairId);
      if (paired) {
        const entry = {
          record: paired,
          score: hit.score,
          via_link: true,
          linked_id: hit.record.id,
        };
        directSolutions.push(entry);
        solutionsById.set(paired.id, entry);
        joinedSolutions.add(paired.id);
      }
    }
  }
  // Join: ideas paired with directly-hit solutions enter the ideas panel.
  for (const hit of directSolutions) {
    if (joinedSolutions.has(hit.record.id)) continue; // entered via its idea; don't chain
    const pairId = linkedIdOf(hit.record);
    if (pairId && !ideasById.has(pairId)) {
      const paired = dataset.ideas.find((i) => i.id === pairId);
      if (paired) {
        const entry = {
          record: paired,
          score: hit.score,
          via_link: true,
          linked_id: hit.record.id,
        };
        directIdeas.push(entry);
        ideasById.set(paired.id, entry);
        joinedIdeas.add(paired.id);
      }
    }
  }

  const toResult = (
    hit: { record: IdeaRecord | SolutionRecord; score: number },
    viaLink: boolean
  ): ScoredResult => ({
    record: hit.record,
    score: Number(hit.score.toFixed(4)),
    via_link: viaLink,
    linked_id: linkedIdOf(hit.record),
  });

  return {
    ideas: directIdeas
      .filter((h) => h.score > 0)
      .map((h) => toResult(h, joinedIdeas.has(h.record.id))),
    solutions: directSolutions
      .filter((h) => h.score > 0)
      .map((h) => toResult(h, joinedSolutions.has(h.record.id))),
  };
}

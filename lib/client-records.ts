/**
 * Client-facing record serialization — shared by the /api/check route and
 * the catalog landing page (Addendum A §1). Embeddings stay server-side;
 * raw user ids become display names. Extracted from route.ts so the landing
 * page's server component reuses exactly the same shape the search API
 * returns — one source of truth for what the browser sees.
 */
import { userEmail, userName } from "./dataset";
import type {
  CatalogRecord,
  ClientIdea,
  ClientSolution,
  Dataset,
  IdeaRecord,
  SolutionRecord,
} from "./types";

export function toClientIdea(record: IdeaRecord): ClientIdea {
  const { embedding: _e, submitted_by, submitted_by_manager, ...rest } = record;
  return {
    ...rest,
    submitted_by_name: userName(submitted_by),
    submitted_by_manager_name: userName(submitted_by_manager),
    submitted_by_email: userEmail(submitted_by),
    submitted_by_manager_email: userEmail(submitted_by_manager),
  } satisfies ClientIdea;
}

export function toClientSolution(record: SolutionRecord): ClientSolution {
  const { embedding: _e, solution_owner, built_by, ...rest } = record;
  return {
    ...rest,
    solution_owner_name: userName(solution_owner),
    built_by_name: userName(built_by),
    solution_owner_email: userEmail(solution_owner),
    built_by_email: userEmail(built_by),
  } satisfies ClientSolution;
}

export function toClientRecord(record: CatalogRecord): ClientIdea | ClientSolution {
  return record.doc_type === "idea" ? toClientIdea(record) : toClientSolution(record);
}

/** The full catalog as the browser sees it (no embeddings, names resolved). */
export interface ClientDataset {
  ideas: ClientIdea[];
  solutions: ClientSolution[];
}

export function toClientDataset(dataset: Dataset): ClientDataset {
  return {
    ideas: dataset.ideas.map(toClientIdea),
    solutions: dataset.solutions.map(toClientSolution),
  };
}

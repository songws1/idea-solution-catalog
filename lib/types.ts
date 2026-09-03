export type DocType = "idea" | "solution";
export type IdeaStatus = "open" | "in_progress" | "solved";
export type ArtifactType = "prompt" | "skill" | "automation";
export type DatasetVariant = "pre" | "post";

export interface UserRecord {
  id: string;
  name: string;
  org: string;
  service: string;
  manager_id: string | null;
}

export interface DuplicateCandidate {
  id: string;
  score: number;
}

export interface IdeaRecord {
  id: string;
  doc_type: "idea";
  org: string;
  service: string;
  title: string;
  description: string;
  notes: string;
  submitted_by: string;
  submitted_by_manager: string;
  submitted_date: string;
  status: IdeaStatus;
  linked_solution_id: string | null;
  duplicate_of: string | null;
  duplicate_candidates: DuplicateCandidate[];

  // Enrichment fields — empty in the pre-enrichment dataset.
  has_solution: boolean;
  solution_link: string | null;
  solution_summary: string | null;
  solution_tags: string[];

  embedding: number[];
}

export interface SolutionRecord {
  id: string;
  doc_type: "solution";
  resolves_idea_id: string | null;
  name: string;
  artifact_type: ArtifactType;
  /**
   * Underlying tool/platform used to build the solution — distinct from
   * artifact_type, which describes the kind of artifact. Fixed list, set at
   * record-creation time (never LLM-inferred at enrichment):
   * "ChatGPT" | "Claude" | "AI + RPA" | "AI + local automation" |
   * "Local automation" | "RPA" | "Process improvement" | "Other"
   */
  technology_type: string;
  raw_description: string;
  ai_generated_summary: string | null;
  category_tags: string[];
  artifact_link: string;
  solution_owner: string;
  built_by: string;
  date_built: string;
  date_last_reviewed: string | null;
  duplicate_of: string | null;
  duplicate_candidates: DuplicateCandidate[];

  embedding: number[];
}

export type CatalogRecord = IdeaRecord | SolutionRecord;

export interface DatasetMeta {
  variant: DatasetVariant;
  generated_at: string;
  embedding_model: string;
  duplicate_threshold: number;
}

export interface Dataset extends DatasetMeta {
  ideas: IdeaRecord[];
  solutions: SolutionRecord[];
}

/** A record as sent to the browser — embeddings and raw user ids are stripped/replaced for payload size and readability. */
export interface ClientIdea
  extends Omit<IdeaRecord, "embedding" | "submitted_by" | "submitted_by_manager"> {
  submitted_by_name: string;
  submitted_by_manager_name: string;
}

export interface ClientSolution
  extends Omit<SolutionRecord, "embedding" | "solution_owner" | "built_by"> {
  solution_owner_name: string;
  built_by_name: string;
}

export type ClientRecord = ClientIdea | ClientSolution;

export interface ScoredResult<R = CatalogRecord> {
  record: R;
  /** Cosine similarity between the query embedding and this record's embedding. */
  score: number;
  /** True when this result is present because of the retrieval-time cross-reference join, not its own rank. */
  via_link: boolean;
  /** The id of the paired record (idea ↔ solution), when one exists. */
  linked_id: string | null;
}

/** Scored result as serialized to the browser (embeddings stripped, names resolved). */
export type ClientScoredResult = ScoredResult<ClientRecord>;

export interface SearchApiResponse {
  query: string;
  variant: DatasetVariant;
  answer: string | null;
  ideas: ClientScoredResult[];
  solutions: ClientScoredResult[];
  error?: string;
}

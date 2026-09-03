import { userName } from "./dataset";
import type { Dataset, DatasetVariant, IdeaRecord, SolutionRecord } from "./types";

/**
 * Read-only CSV export (Addendum A §5). Flattens the currently-loaded dataset
 * into two CSVs server-side. Same user-id → display-name resolution as the
 * ClientIdea/ClientSolution shape in app/api/search/route.ts, via userName().
 * duplicate_candidates flatten to a count plus a comma-joined ID list.
 * Embeddings are excluded — they are build-time internals, not catalog data.
 */

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvField).join(","));
  return lines.join("\r\n") + "\r\n";
}

// csvField and csvEscape are the same function; kept as one alias for clarity.
const csvField = csvEscape;

const IDEA_HEADERS = [
  "id",
  "doc_type",
  "org",
  "service",
  "title",
  "description",
  "notes",
  "submitted_by_name",
  "submitted_by_manager_name",
  "submitted_date",
  "status",
  "linked_solution_id",
  "duplicate_of",
  "duplicate_candidate_count",
  "duplicate_candidate_ids",
  "has_solution",
  "solution_link",
  "solution_summary",
  "solution_tags",
];

function ideaRow(idea: IdeaRecord): unknown[] {
  return [
    idea.id,
    idea.doc_type,
    idea.org,
    idea.service,
    idea.title,
    idea.description,
    idea.notes,
    userName(idea.submitted_by),
    userName(idea.submitted_by_manager),
    idea.submitted_date,
    idea.status,
    idea.linked_solution_id,
    idea.duplicate_of,
    idea.duplicate_candidates.length,
    idea.duplicate_candidates.map((c) => c.id).join(","),
    idea.has_solution,
    idea.solution_link,
    idea.solution_summary,
    idea.solution_tags.join(","),
  ];
}

const SOLUTION_HEADERS = [
  "id",
  "doc_type",
  "resolves_idea_id",
  "name",
  "artifact_type",
  "technology_type",
  "raw_description",
  "ai_generated_summary",
  "category_tags",
  "artifact_link",
  "solution_owner_name",
  "built_by_name",
  "date_built",
  "date_last_reviewed",
  "duplicate_of",
  "duplicate_candidate_count",
  "duplicate_candidate_ids",
];

function solutionRow(sol: SolutionRecord): unknown[] {
  return [
    sol.id,
    sol.doc_type,
    sol.resolves_idea_id,
    sol.name,
    sol.artifact_type,
    sol.technology_type,
    sol.raw_description,
    sol.ai_generated_summary,
    sol.category_tags.join(","),
    sol.artifact_link,
    userName(sol.solution_owner),
    userName(sol.built_by),
    sol.date_built,
    sol.date_last_reviewed,
    sol.duplicate_of,
    sol.duplicate_candidates.length,
    sol.duplicate_candidates.map((c) => c.id).join(","),
  ];
}

export function variantLabel(variant: DatasetVariant): string {
  return variant === "pre" ? "pre-enrichment" : "post-enrichment";
}

export function buildIdeasCsv(dataset: Dataset): string {
  return toCsv(IDEA_HEADERS, dataset.ideas.map(ideaRow));
}

export function buildSolutionsCsv(dataset: Dataset): string {
  return toCsv(SOLUTION_HEADERS, dataset.solutions.map(solutionRow));
}

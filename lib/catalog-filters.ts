/**
 * Catalog browse filters for the landing page (Addendum A §1.1-§1.3).
 * Pure client-side filtering over the already-loaded dataset — filters never
 * touch the LLM or the retrieval route (no runtime database; §1.1.2).
 *
 * Solution org/service resolution reuses the orgOfSolution logic from
 * lib/governance.ts (imported, not duplicated) plus the same fallback pattern
 * for service (linked idea first, owner's user record second).
 */
import { orgOfSolution } from "./governance";
import { userById } from "./dataset";
import { TAG_TAXONOMY } from "./tag-taxonomy";
import type { ClientDataset } from "./client-records";
import type { ClientIdea, ClientSolution, Dataset } from "./types";

/** Chris's fixed 8-value list — set at seed time, never LLM-inferred. */
export const TECHNOLOGY_TYPES = [
  "ChatGPT",
  "Claude",
  "AI + RPA",
  "AI + local automation",
  "Local automation",
  "RPA",
  "Process improvement",
  "Other",
] as const;

export const ARTIFACT_TYPES = ["prompt", "skill", "automation"] as const;

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Per-solution org/service, resolved server-side where users/dataset live. */
export interface SolutionMeta {
  org: string;
  service: string;
}
export type SolutionMetaMap = Record<string, SolutionMeta>;

/**
 * Service resolution mirrors orgOfSolution: the linked idea's service first;
 * orphan solutions fall back to their owner's user-record service (and end up
 * with "Unassigned" alongside org when neither exists).
 */
export function buildSolutionMeta(dataset: Dataset): SolutionMetaMap {
  const meta: SolutionMetaMap = {};
  for (const sol of dataset.solutions) {
    const org = orgOfSolution(dataset, sol);
    let service: string | undefined;
    if (sol.resolves_idea_id) {
      service = dataset.ideas.find((i) => i.id === sol.resolves_idea_id)?.service;
    }
    if (!service) service = userById(sol.solution_owner)?.service;
    meta[sol.id] = { org, service: service ?? "Unassigned" };
  }
  return meta;
}

export interface FilterState {
  services: string[];
  artifactTypes: string[];
  technologyTypes: string[];
  orgs: string[];
  years: string[];
  months: string[]; // month names, per MONTH_NAMES
  tags: string[];   // taxonomy tags (also set by clicking a tag pill, §1.4)
}

export const EMPTY_FILTERS: FilterState = {
  services: [],
  artifactTypes: [],
  technologyTypes: [],
  orgs: [],
  years: [],
  months: [],
  tags: [],
};

export function isFilterActive(f: FilterState): boolean {
  return (
    f.services.length > 0 ||
    f.artifactTypes.length > 0 ||
    f.technologyTypes.length > 0 ||
    f.orgs.length > 0 ||
    f.years.length > 0 ||
    f.months.length > 0 ||
    f.tags.length > 0
  );
}

export function activeFilterCount(f: FilterState): number {
  return (
    f.services.length +
    f.artifactTypes.length +
    f.technologyTypes.length +
    f.orgs.length +
    f.years.length +
    f.months.length +
    f.tags.length
  );
}

/** Toggle a value within one facet (multi-select, OR within / AND across). */
export function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function yearOf(iso: string): string {
  return iso.slice(0, 4);
}
function monthNameOf(iso: string): string {
  const idx = Number(iso.slice(5, 7)) - 1;
  return MONTH_NAMES[idx] ?? "";
}

function overlaps(a: string[], b: string[]): boolean {
  return a.some((v) => b.includes(v));
}

/**
 * Date filters use the date that makes browse sense per doc type:
 * submitted_date for ideas, date_built for solutions (Addendum §1.3).
 */
function ideaMatches(
  idea: ClientIdea,
  f: FilterState
): boolean {
  if (f.services.length > 0 && !f.services.includes(idea.service)) return false;
  if (f.orgs.length > 0 && !f.orgs.includes(idea.org)) return false;
  if (f.years.length > 0 && !f.years.includes(yearOf(idea.submitted_date))) return false;
  if (f.months.length > 0 && !f.months.includes(monthNameOf(idea.submitted_date))) return false;
  if (f.tags.length > 0 && !overlaps(f.tags, idea.solution_tags)) return false;
  // artifact/technology types describe solutions only — not applied to ideas.
  return true;
}

function solutionMatches(
  sol: ClientSolution,
  meta: SolutionMeta | undefined,
  f: FilterState
): boolean {
  const org = meta?.org ?? "Unassigned";
  const service = meta?.service ?? "Unassigned";
  if (f.services.length > 0 && !f.services.includes(service)) return false;
  if (f.orgs.length > 0 && !f.orgs.includes(org)) return false;
  if (f.artifactTypes.length > 0 && !f.artifactTypes.includes(sol.artifact_type)) return false;
  if (f.technologyTypes.length > 0 && !f.technologyTypes.includes(sol.technology_type)) return false;
  if (f.years.length > 0 && !f.years.includes(yearOf(sol.date_built))) return false;
  if (f.months.length > 0 && !f.months.includes(monthNameOf(sol.date_built))) return false;
  if (f.tags.length > 0 && !overlaps(f.tags, sol.category_tags)) return false;
  return true;
}

export interface FilteredCatalog {
  solutions: ClientSolution[];
  /** Ideas without a built solution — the secondary section under the grid. */
  openIdeas: ClientIdea[];
}

export function applyFilters(
  catalog: ClientDataset,
  meta: SolutionMetaMap,
  f: FilterState
): FilteredCatalog {
  const solutions = catalog.solutions.filter((s) => solutionMatches(s, meta[s.id], f));
  // "Open ideas" = anything not yet resolved by a solution (§1.2 secondary section).
  const openIdeas = catalog.ideas.filter(
    (i) => i.status !== "solved" && !i.linked_solution_id && ideaMatches(i, f)
  );
  return { solutions, openIdeas };
}

export interface FilterOptions {
  services: string[];
  artifactTypes: string[];
  technologyTypes: string[];
  orgs: string[];
  years: string[];
  /** Month names present in the data, chronological order. */
  months: string[];
  tags: string[];
}

/**
 * Options derived from the loaded dataset at request time (§1.3) — orgs and
 * services from idea records (solutions inherit via buildSolutionMeta),
 * technology types ordered by the canonical list. Taxonomy is always the full
 * fixed 20-tag list, whether or not every tag is currently in use.
 */
export function deriveFilterOptions(
  catalog: ClientDataset,
  meta: SolutionMetaMap
): FilterOptions {
  const services = new Set<string>();
  for (const i of catalog.ideas) services.add(i.service);
  for (const m of Object.values(meta)) services.add(m.service);
  const orgs = new Set<string>();
  for (const i of catalog.ideas) orgs.add(i.org);
  for (const m of Object.values(meta)) orgs.add(m.org);
  const artifact = new Set<string>();
  const tech = new Set<string>();
  const years = new Set<string>();
  const months = new Set<number>();
  for (const s of catalog.solutions) {
    artifact.add(s.artifact_type);
    tech.add(s.technology_type);
    years.add(yearOf(s.date_built));
    months.add(Number(s.date_built.slice(5, 7)));
  }
  for (const i of catalog.ideas) {
    years.add(yearOf(i.submitted_date));
    months.add(Number(i.submitted_date.slice(5, 7)));
  }
  return {
    services: [...services].sort((a, b) => a.localeCompare(b)),
    artifactTypes: ARTIFACT_TYPES.filter((t) => artifact.has(t)),
    technologyTypes: TECHNOLOGY_TYPES.filter((t) => tech.has(t)),
    orgs: [...orgs].sort((a, b) => a.localeCompare(b)),
    years: [...years].sort(),
    months: MONTH_NAMES.filter((_, idx) => months.has(idx + 1)),
    tags: [...TAG_TAXONOMY],
  };
}

/** Plain-language description of active filters for the empty state (§1.2). */
export function describeFilters(f: FilterState): string[] {
  // v3 §1 mapping: stored `service` renders as "Sub-service"; stored `org` as "Service".
  const parts: string[] = [];
  if (f.services.length) parts.push(`Sub-service: ${f.services.join(", ")}`);
  if (f.artifactTypes.length) parts.push(`Solution type: ${f.artifactTypes.join(", ")}`);
  if (f.technologyTypes.length) parts.push(`Technology type: ${f.technologyTypes.join(", ")}`);
  if (f.orgs.length) parts.push(`Service: ${f.orgs.join(", ")}`);
  if (f.years.length) parts.push(`Year: ${f.years.join(", ")}`);
  if (f.months.length) parts.push(`Month: ${f.months.join(", ")}`);
  if (f.tags.length) parts.push(`Taxonomy: ${f.tags.join(", ")}`);
  return parts;
}
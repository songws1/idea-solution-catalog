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
import type { ClientIdea, ClientScoredResult, ClientSolution, Dataset } from "./types";

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
  /**
   * Ideas with no built solution (status open OR in_progress) — the board's
   * idea-side columns (v3 §3.2). buildKanbanColumns splits them by status;
   * solved ideas are excluded here because they render as the Resolves line
   * on their solution's card, never as their own card.
   */
  ideas: ClientIdea[];
}

export function applyFilters(
  catalog: ClientDataset,
  meta: SolutionMetaMap,
  f: FilterState
): FilteredCatalog {
  const solutions = catalog.solutions.filter((s) => solutionMatches(s, meta[s.id], f));
  const ideas = catalog.ideas.filter(
    (i) => i.status !== "solved" && !i.linked_solution_id && ideaMatches(i, f)
  );
  return { solutions, ideas };
}

/**
 * The same facet logic applied to search results (v3 §0/§3.1: the filter
 * chips narrow the one board in both browse and search mode). Score, ranking,
 * and the match-label scale are untouched — this only removes records from
 * the displayed set.
 */
export function filterScored(
  ideas: ClientScoredResult[],
  solutions: ClientScoredResult[],
  meta: SolutionMetaMap,
  f: FilterState
): { ideas: ClientScoredResult[]; solutions: ClientScoredResult[] } {
  return {
    ideas: ideas.filter((r) => r.record.doc_type === "idea" && ideaMatches(r.record, f)),
    solutions: solutions.filter(
      (r) => r.record.doc_type === "solution" && solutionMatches(r.record, meta[r.record.id], f)
    ),
  };
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

/**
 * How many records each filter value would give you (v4.12).
 *
 * Light UAT's loudest complaint was that testers did not know what to type,
 * and its quieter one was that filtering led to an empty board with no hint of
 * why. v4.10 answered the first for a `clear` verdict only, with CoveragePanel.
 * This answers both, always, for free: a facet menu that carries counts IS the
 * map of the catalog, and a value showing 0 is a dead end the reader can see
 * before they walk into it.
 *
 * Counts are faceted, not static. Each facet is counted with EVERY OTHER active
 * filter applied but its own selection removed, which is what makes them read
 * as "what would happen if I picked this" rather than "what exists somewhere in
 * the catalog". With Service = HR already chosen, the Solution-type menu shows
 * HR's counts; the Service menu still shows every service, so the reader can
 * switch without first clearing.
 *
 * The pool is supplied by the caller rather than taken from the whole dataset,
 * because on a checked board the board is not the catalog — it is the ranked
 * subset. Counting the catalog there would print numbers the reader cannot
 * reach, which is the exact failure this is meant to remove.
 */
export type FacetCounts = Record<keyof FilterState, Record<string, number>>;

/**
 * Facets that describe a built solution and therefore do not filter ideas at
 * all — see ideaMatches, which ignores both. Their counts are counts of
 * SOLUTIONS, not of the board: "Solution type ▸ automation 30" means thirty
 * built automations, while the board after that click still holds every idea.
 *
 * Exported because the menu has to say so. This was invisible behaviour until
 * counts made it visible: a count of 106 there (thirty solutions plus every
 * idea, which the choice does not touch) would be true of the board and
 * useless as a number, since every artifact type would show about a hundred.
 */
export const SOLUTION_ONLY_FACETS = new Set<keyof FilterState>([
  "artifactTypes",
  "technologyTypes",
]);

const FACET_KEYS: (keyof FilterState)[] = [
  "services",
  "artifactTypes",
  "technologyTypes",
  "orgs",
  "years",
  "months",
  "tags",
];

function bump(into: Record<string, number>, value: string | undefined): void {
  if (!value) return;
  into[value] = (into[value] ?? 0) + 1;
}

export function facetCounts(
  ideas: ClientIdea[],
  solutions: ClientSolution[],
  meta: SolutionMetaMap,
  f: FilterState
): FacetCounts {
  const out = {} as FacetCounts;

  for (const key of FACET_KEYS) {
    // Its own selection removed; everything else still applies.
    const others: FilterState = { ...f, [key]: [] };
    const tally: Record<string, number> = {};

    for (const idea of ideas) {
      if (!ideaMatches(idea, others)) continue;
      switch (key) {
        case "services":
          bump(tally, idea.service);
          break;
        case "orgs":
          bump(tally, idea.org);
          break;
        case "years":
          bump(tally, yearOf(idea.submitted_date));
          break;
        case "months":
          bump(tally, monthNameOf(idea.submitted_date));
          break;
        case "tags":
          for (const t of idea.solution_tags) bump(tally, t);
          break;
        // artifact/technology type describe solutions only; ideas add nothing.
        default:
          break;
      }
    }

    for (const sol of solutions) {
      if (!solutionMatches(sol, meta[sol.id], others)) continue;
      switch (key) {
        case "services":
          bump(tally, meta[sol.id]?.service ?? "Unassigned");
          break;
        case "orgs":
          bump(tally, meta[sol.id]?.org ?? "Unassigned");
          break;
        case "artifactTypes":
          bump(tally, sol.artifact_type);
          break;
        case "technologyTypes":
          bump(tally, sol.technology_type);
          break;
        case "years":
          bump(tally, yearOf(sol.date_built));
          break;
        case "months":
          bump(tally, monthNameOf(sol.date_built));
          break;
        case "tags":
          for (const t of sol.category_tags) bump(tally, t);
          break;
        default:
          break;
      }
    }

    out[key] = tally;
  }

  return out;
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
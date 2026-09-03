import { agingBucket, ideaAgeDays, solutionReviewAgeDays } from "./aging";
import { userName, userById } from "./dataset";
import type {
  Dataset,
  IdeaRecord,
  SolutionRecord,
} from "./types";

function orgOfUser(userId: string): string | undefined {
  return userById(userId)?.org;
}

export function orgOfSolution(dataset: Dataset, sol: SolutionRecord): string {
  if (sol.resolves_idea_id) {
    const idea = dataset.ideas.find((i) => i.id === sol.resolves_idea_id);
    if (idea) return idea.org;
  }
  // Orphan solutions carry their owner's org.
  return orgOfUser(sol.solution_owner) ?? "Unassigned";
}

function isFlagged(record: IdeaRecord | SolutionRecord): boolean {
  return record.duplicate_candidates.length > 0 || record.duplicate_of !== null;
}

// ---------------------------------------------------------------------------
// Widget 1 — status breakdown by org
// ---------------------------------------------------------------------------

export interface StatusByOrgRow {
  org: string;
  ideasOpen: number;
  ideasInProgress: number;
  ideasSolved: number;
  /** Solutions linked to an idea (their de facto status comes from the idea). */
  solutionsLinked: number;
  /** Solutions with no linked idea (the historical/unlinked gap case). */
  solutionsOrphan: number;
}

export function statusByOrg(dataset: Dataset): StatusByOrgRow[] {
  const rows = new Map<string, StatusByOrgRow>();
  const rowFor = (org: string): StatusByOrgRow => {
    let row = rows.get(org);
    if (!row) {
      row = { org, ideasOpen: 0, ideasInProgress: 0, ideasSolved: 0, solutionsLinked: 0, solutionsOrphan: 0 };
      rows.set(org, row);
    }
    return row;
  };
  for (const idea of dataset.ideas) {
    const row = rowFor(idea.org);
    if (idea.status === "open") row.ideasOpen += 1;
    else if (idea.status === "in_progress") row.ideasInProgress += 1;
    else row.ideasSolved += 1;
  }
  for (const sol of dataset.solutions) {
    const row = rowFor(orgOfSolution(dataset, sol));
    if (sol.resolves_idea_id) row.solutionsLinked += 1;
    else row.solutionsOrphan += 1;
  }
  return [...rows.values()].sort((a, b) => a.org.localeCompare(b.org));
}

// ---------------------------------------------------------------------------
// Widget 2 — aging
// ---------------------------------------------------------------------------

export interface AgingRow {
  org: string;
  under30: number;
  d30to90: number;
  over90: number;
  neverReviewed: number;
}

export function agingData(
  dataset: Dataset,
  now: Date = new Date()
): { ideas: AgingRow[]; solutions: AgingRow[] } {
  const build = (kind: "idea" | "solution"): AgingRow[] => {
    const rows = new Map<string, AgingRow>();
    const rowFor = (org: string): AgingRow => {
      let row = rows.get(org);
      if (!row) {
        row = { org, under30: 0, d30to90: 0, over90: 0, neverReviewed: 0 };
        rows.set(org, row);
      }
      return row;
    };
    if (kind === "idea") {
      for (const idea of dataset.ideas) {
        if (idea.status === "solved") continue; // stalled-item widget: only unsolved ideas age
        const b = agingBucket(ideaAgeDays(idea.submitted_date, now));
        const row = rowFor(idea.org);
        if (b === "under 30 days") row.under30 += 1;
        else if (b === "30 to 90 days") row.d30to90 += 1;
        else row.over90 += 1;
      }
    } else {
      for (const sol of dataset.solutions) {
        const age = solutionReviewAgeDays(sol.date_last_reviewed, now);
        const row = rowFor(orgOfSolution(dataset, sol));
        if (age === null) row.neverReviewed += 1;
        else if (agingBucket(age) === "under 30 days") row.under30 += 1;
        else if (agingBucket(age) === "30 to 90 days") row.d30to90 += 1;
        else row.over90 += 1;
      }
    }
    return [...rows.values()].sort((a, b) => a.org.localeCompare(b.org));
  };
  return { ideas: build("idea"), solutions: build("solution") };
}

// ---------------------------------------------------------------------------
// Widget 3 — build throughput (ideas → solutions conversion over time)
// ---------------------------------------------------------------------------

export interface ThroughputPoint {
  month: string; // YYYY-MM
  ideasSubmitted: number;
  solutionsBuilt: number;
}

export function throughput(dataset: Dataset): { points: ThroughputPoint[]; conversionPct: number } {
  const months = new Map<string, ThroughputPoint>();
  const pointFor = (month: string): ThroughputPoint => {
    let p = months.get(month);
    if (!p) {
      p = { month, ideasSubmitted: 0, solutionsBuilt: 0 };
      months.set(month, p);
    }
    return p;
  };
  for (const idea of dataset.ideas) pointFor(idea.submitted_date.slice(0, 7)).ideasSubmitted += 1;
  for (const sol of dataset.solutions) pointFor(sol.date_built.slice(0, 7)).solutionsBuilt += 1;
  const points = [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
  const linked = dataset.ideas.filter((i) => i.linked_solution_id).length;
  const conversionPct = dataset.ideas.length ? Math.round((linked / dataset.ideas.length) * 100) : 0;
  return { points, conversionPct };
}

// ---------------------------------------------------------------------------
// Widget 4 — % flagged duplicate per org
// ---------------------------------------------------------------------------

export interface DuplicateRateRow {
  org: string;
  records: number;
  flagged: number;
  pct: number;
}

export function duplicateRateByOrg(dataset: Dataset): DuplicateRateRow[] {
  const rows = new Map<string, { records: number; flagged: number }>();
  const rowFor = (org: string) => {
    let row = rows.get(org);
    if (!row) {
      row = { records: 0, flagged: 0 };
      rows.set(org, row);
    }
    return row;
  };
  for (const idea of dataset.ideas) {
    const row = rowFor(idea.org);
    row.records += 1;
    if (isFlagged(idea)) row.flagged += 1;
  }
  for (const sol of dataset.solutions) {
    const row = rowFor(orgOfSolution(dataset, sol));
    row.records += 1;
    if (isFlagged(sol)) row.flagged += 1;
  }
  return [...rows.entries()]
    .map(([org, r]) => ({ org, ...r, pct: r.records ? Math.round((r.flagged / r.records) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct);
}

// ---------------------------------------------------------------------------
// Org dot grid — one dot per record, color-coded by state
// ---------------------------------------------------------------------------

export type DotState =
  | "duplicate"
  | "open"
  | "in_progress"
  | "solved"
  | "solution_linked"
  | "solution_orphan";

export interface OrgDotGridRow {
  org: string;
  dots: Array<{ recordId: string; docType: "idea" | "solution"; state: DotState; title: string }>;
}

export function orgDotGrid(dataset: Dataset): OrgDotGridRow[] {
  const rows = new Map<string, OrgDotGridRow>();
  const rowFor = (org: string): OrgDotGridRow => {
    let row = rows.get(org);
    if (!row) {
      row = { org, dots: [] };
      rows.set(org, row);
    }
    return row;
  };
  for (const idea of dataset.ideas) {
    const state: DotState = isFlagged(idea)
      ? "duplicate"
      : idea.status === "open"
        ? "open"
        : idea.status === "in_progress"
          ? "in_progress"
          : "solved";
    rowFor(idea.org).dots.push({ recordId: idea.id, docType: "idea", state, title: idea.title });
  }
  for (const sol of dataset.solutions) {
    const state: DotState = isFlagged(sol)
      ? "duplicate"
      : sol.resolves_idea_id
        ? "solution_linked"
        : "solution_orphan";
    rowFor(orgOfSolution(dataset, sol)).dots.push({
      recordId: sol.id,
      docType: "solution",
      state,
      title: sol.name,
    });
  }
  return [...rows.values()]
    .map((row) => ({ ...row, dots: row.dots.sort((a, b) => a.recordId.localeCompare(b.recordId)) }))
    .sort((a, b) => a.org.localeCompare(b.org));
}

// ---------------------------------------------------------------------------
// Duplicate clusters — connected components over duplicate_candidates,
// merged with confirmed duplicate_of links. Read from static fields only.
// ---------------------------------------------------------------------------

export interface ClusterMember {
  record: IdeaRecord | SolutionRecord;
  org: string;
  /** Ideas: submitter and submitter's manager. Solutions: solution owner. */
  actorLabel: string;
  actorName: string;
  managerName?: string;
}

export interface DuplicateCluster {
  docType: "idea" | "solution";
  members: ClusterMember[];
  /** Contains at least one human-validated duplicate_of link. */
  confirmed: boolean;
}

export function duplicateClusters(dataset: Dataset): DuplicateCluster[] {
  const clusters: DuplicateCluster[] = [];

  const buildFor = (docType: "idea" | "solution") => {
    const records = (docType === "idea" ? dataset.ideas : dataset.solutions) as Array<
      IdeaRecord | SolutionRecord
    >;
    const byId = new Map(records.map((r) => [r.id, r]));
    const parent = new Map(records.map((r) => [r.id, r.id]));
    const find = (id: string): string => {
      let root = id;
      while (parent.get(root) !== root) root = parent.get(root) as string;
      return root;
    };
    const union = (a: string, b: string) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent.set(ra, rb);
    };
    for (const r of records) {
      for (const c of r.duplicate_candidates) {
        if (byId.has(c.id)) union(r.id, c.id);
      }
      if (r.duplicate_of && byId.has(r.duplicate_of)) union(r.id, r.duplicate_of);
    }
    const groups = new Map<string, Array<IdeaRecord | SolutionRecord>>();
    for (const r of records) {
      const root = find(r.id);
      const group = groups.get(root) ?? [];
      group.push(r);
      groups.set(root, group);
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      const members: ClusterMember[] = group.map((r) => {
        if (r.doc_type === "idea") {
          const idea = r as IdeaRecord;
          return {
            record: idea,
            org: idea.org,
            actorLabel: "submitted by",
            actorName: userName(idea.submitted_by),
            managerName: userName(idea.submitted_by_manager),
          };
        }
        const sol = r as SolutionRecord;
        return {
          record: sol,
          org: orgOfSolution(dataset, sol),
          actorLabel: "owner",
          actorName: userName(sol.solution_owner),
        };
      });
      const confirmed = group.some((r) => r.duplicate_of && byId.has(r.duplicate_of));
      clusters.push({ docType, members, confirmed });
    }
  };

  buildFor("idea");
  buildFor("solution");
  return clusters.sort(
    (a, b) => a.docType.localeCompare(b.docType) || b.members.length - a.members.length
  );
}

// ---------------------------------------------------------------------------
// Widget 5 — estimated savings from reuse (illustrative only)
// ---------------------------------------------------------------------------

export interface ReuseSavingsConfig {
  /** Illustrative assumed effort per net-new build, in hours. */
  hoursPerNetNewBuild: number;
  /** Illustrative assumed fully-loaded hourly rate, in USD. */
  hourlyRateUsd: number;
}

export const DEFAULT_REUSE_SAVINGS_CONFIG: ReuseSavingsConfig = {
  hoursPerNetNewBuild: 50,
  hourlyRateUsd: 50,
};

export interface ReuseSavings {
  openIdeasResolvable: Array<{ idea: IdeaRecord; resolvableVia: IdeaRecord }>;
  count: number;
  estimatedHours: number;
  estimatedUsd: number;
  config: ReuseSavingsConfig;
}

/**
 * Open ideas that duplicate an already-solved idea could likely be resolved by
 * reusing that existing solution instead of funding a net-new build.
 * The formula is an illustrative placeholder, not a validated figure — the UI
 * must state that assumption on screen.
 */
export function reuseSavings(
  dataset: Dataset,
  config: ReuseSavingsConfig = DEFAULT_REUSE_SAVINGS_CONFIG
): ReuseSavings {
  const ideaById = new Map(dataset.ideas.map((i) => [i.id, i]));
  const resolvable: Array<{ idea: IdeaRecord; resolvableVia: IdeaRecord }> = [];
  for (const idea of dataset.ideas) {
    if (idea.status === "solved" || idea.linked_solution_id) continue;
    for (const cand of idea.duplicate_candidates) {
      const other = ideaById.get(cand.id);
      if (other && other.status === "solved" && other.has_solution) {
        resolvable.push({ idea, resolvableVia: other });
        break;
      }
    }
  }
  const estimatedHours = resolvable.length * config.hoursPerNetNewBuild;
  return {
    openIdeasResolvable: resolvable,
    count: resolvable.length,
    estimatedHours,
    estimatedUsd: estimatedHours * config.hourlyRateUsd,
    config,
  };
}





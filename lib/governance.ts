import { agingBucket, ideaAgeDays, solutionReviewAgeDays } from "./aging";
import { userEmail, userName, userById } from "./dataset";
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
  /** Synthetic contact address from the directory, null when unresolvable. */
  actorEmail: string | null;
  managerName?: string;
  managerEmail?: string | null;
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
            actorEmail: userEmail(idea.submitted_by),
            managerName: userName(idea.submitted_by_manager),
            managerEmail: userEmail(idea.submitted_by_manager),
          };
        }
        const sol = r as SolutionRecord;
        return {
          record: sol,
          org: orgOfSolution(dataset, sol),
          actorLabel: "owner",
          actorName: userName(sol.solution_owner),
          actorEmail: userEmail(sol.solution_owner),
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
// Summary tiles — v3 §4.1
//
// The four numbers a reviewer needs before reading any table. Every figure is
// counted from the dataset's static fields; nothing here is a trend or an
// estimate, which is why no tile carries a delta or a sparkline.
// ---------------------------------------------------------------------------

export interface SummaryTile {
  /** Stable id, used as the tile's link target on the widget it summarizes. */
  anchor: string;
  label: string;
  value: number;
  subLabel: string;
}

export function summaryTiles(
  dataset: Dataset,
  now: Date = new Date()
): SummaryTile[] {
  const services = new Set(dataset.ideas.map((i) => i.org));
  for (const sol of dataset.solutions) services.add(orgOfSolution(dataset, sol));

  const unresolved = dataset.ideas.filter((i) => i.status !== "solved");
  const unresolvedOver90 = unresolved.filter(
    (i) => agingBucket(ideaAgeDays(i.submitted_date, now)) === "over 90 days"
  ).length;

  const neverReviewed = dataset.solutions.filter(
    (s) => solutionReviewAgeDays(s.date_last_reviewed, now) === null
  ).length;

  const flagged = [...dataset.ideas, ...dataset.solutions].filter(isFlagged).length;
  const clusterCount = duplicateClusters(dataset).length;

  const plural = (n: number, one: string, many = `${one}s`) =>
    `${n} ${n === 1 ? one : many}`;

  return [
    {
      anchor: "status-by-service",
      label: "Records",
      value: dataset.ideas.length + dataset.solutions.length,
      subLabel: `in ${plural(services.size, "service")}`,
    },
    {
      anchor: "aging",
      label: "Awaiting resolution",
      value: unresolved.length,
      subLabel: `${unresolvedOver90} over 90 days`,
    },
    {
      anchor: "aging",
      label: "Solutions never reviewed",
      value: neverReviewed,
      subLabel: `of ${plural(dataset.solutions.length, "solution")} built`,
    },
    {
      anchor: "duplicate-clusters",
      label: "Flagged for review",
      value: flagged,
      subLabel: `in ${plural(clusterCount, "cluster")}`,
    },
  ];
}

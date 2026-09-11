import { solutionFreshness } from "./freshness";
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
// Widget 1 — where ideas stop (v4.13)
//
// Replaces "Status by service", a six-column table of raw counts that asked the
// reader to do the subtraction themselves. The question a governance page has
// to answer first is not "how many are open" but "where does this program lose
// things", and that is a funnel: every stage is a strict subset of the one
// above it, so each gap is a real loss rather than two unrelated numbers side
// by side.
//
// Deliberately built from idea status alone. Adding solutions as a fourth stage
// would break the subset property, since a solution can exist with no idea
// behind it — that case is reported separately as `unrequested`, which is its
// own finding: work that never went through the front door at all.
// ---------------------------------------------------------------------------

export interface FunnelStage {
  key: "raised" | "started" | "built";
  label: string;
  value: number;
  /** Records that stopped here rather than reaching the next stage. */
  lost: { count: number; label: string } | null;
}

export interface ProgramFunnel {
  stages: FunnelStage[];
  /** Solutions with no idea behind them — built outside the funnel entirely. */
  unrequested: number;
  totalSolutions: number;
}

export function programFunnel(dataset: Dataset): ProgramFunnel {
  const raised = dataset.ideas.length;
  const started = dataset.ideas.filter((i) => i.status !== "open").length;
  const built = dataset.ideas.filter((i) => i.status === "solved").length;
  const unrequested = dataset.solutions.filter((s) => !s.resolves_idea_id).length;

  return {
    stages: [
      {
        key: "raised",
        label: "Ideas raised",
        value: raised,
        lost: {
          count: raised - started,
          label: "never picked up",
        },
      },
      {
        key: "started",
        label: "Picked up",
        value: started,
        lost: {
          count: started - built,
          label: "in progress, not built yet",
        },
      },
      { key: "built", label: "Built", value: built, lost: null },
    ],
    unrequested,
    totalSolutions: dataset.solutions.length,
  };
}

// ---------------------------------------------------------------------------
// Widget 1b — demand against supply, per service (v4.13)
//
// The other half of what the old status table held, in the shape that makes it
// answerable: unmet demand on one side of a centre line and built supply on the
// other, so the asymmetry is the picture rather than an arithmetic exercise.
// Ordered by the gap, largest first, because "which service is furthest behind"
// is the only reason to look.
// ---------------------------------------------------------------------------

export interface DemandSupplyRow {
  org: string;
  /** Ideas still open or in progress — asked for, not yet delivered. */
  unmet: number;
  /** Solutions attributed to this service, however they arrived. */
  built: number;
}

export function demandSupply(dataset: Dataset): DemandSupplyRow[] {
  const rows = new Map<string, DemandSupplyRow>();
  const rowFor = (org: string): DemandSupplyRow => {
    let row = rows.get(org);
    if (!row) {
      row = { org, unmet: 0, built: 0 };
      rows.set(org, row);
    }
    return row;
  };
  for (const idea of dataset.ideas) {
    const row = rowFor(idea.org);
    if (idea.status !== "solved") row.unmet += 1;
  }
  for (const sol of dataset.solutions) rowFor(orgOfSolution(dataset, sol)).built += 1;

  return [...rows.values()].sort(
    (a, b) => b.unmet - b.built - (a.unmet - a.built) || a.org.localeCompare(b.org)
  );
}

// ---------------------------------------------------------------------------
// Widget 2 — aging
// ---------------------------------------------------------------------------

/**
 * Field names carry no numbers (v4.8). They used to be under30/d30to90/over90,
 * which meant the boundaries lived in three places: lib/aging.ts, these keys,
 * and the widget's column headers. Moving the scale then required finding all
 * three, and the identifier was the one nobody would notice was now a lie.
 */
export interface AgingRow {
  org: string;
  recent: number;
  mid: number;
  old: number;
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
        row = { org, recent: 0, mid: 0, old: 0, neverReviewed: 0 };
        rows.set(org, row);
      }
      return row;
    };
    if (kind === "idea") {
      for (const idea of dataset.ideas) {
        if (idea.status === "solved") continue; // stalled-item widget: only unsolved ideas age
        const b = agingBucket(ideaAgeDays(idea.submitted_date, now), "idea");
        const row = rowFor(idea.org);
        if (b === "under 6 months") row.recent += 1;
        else if (b === "6 to 12 months") row.mid += 1;
        else row.old += 1;
      }
    } else {
      for (const sol of dataset.solutions) {
        const age = solutionReviewAgeDays(sol.date_last_reviewed, now);
        const row = rowFor(orgOfSolution(dataset, sol));
        if (age === null) row.neverReviewed += 1;
        else if (agingBucket(age, "solution") === "under 6 months") row.recent += 1;
        else if (agingBucket(age, "solution") === "6 to 12 months") row.mid += 1;
        else row.old += 1;
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

/*
 * "Duplicate rate by service" and the org dot grid lived here until v4.13.
 *
 * The rate widget stated the same finding the cluster list states, aggregated
 * to a percentage — the page said it twice, and the percentage was the version
 * nobody could act on. Once the clusters are banded by what to do about them,
 * the rate adds an ordering the bands already give, in a worse unit.
 *
 * The dot grid drew one dot per record, 182 of them, colour-coded by state. It
 * asked the reader to count coloured dots to recover numbers that the other
 * widgets print. Removing it is the reason the funnel and the demand/supply
 * bars fit without the page growing.
 */

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

/**
 * What to do about a cluster, which is not the same question as what kind of
 * records are in it (v4.13).
 *
 * Ten clusters used to render identically, so the cheapest action on the page
 * looked exactly like the most expensive one. They are not the same work at
 * all, and the data separates them cleanly:
 *
 *   ask-answered — someone is still asking for a thing this catalog has already
 *     built. Close the request and point at the build. Costs nothing, today.
 *   none-built   — every member is still a request. Merge them before either
 *     gets funded. The cheapest saving available, because the waste has not
 *     been incurred yet.
 *   built-twice  — the money is already spent, either as two solutions flagged
 *     against each other or as several duplicate requests each closed with its
 *     own build. Consolidating or retiring one is real work.
 *
 * Ordered cheapest-first when rendered, which is the opposite of ordering by
 * severity and the right way round for a queue somebody has to work.
 */
export type ClusterBand = "ask-answered" | "none-built" | "built-twice";

export const CLUSTER_BAND_ORDER: ClusterBand[] = ["ask-answered", "none-built", "built-twice"];

export interface DuplicateCluster {
  docType: "idea" | "solution";
  members: ClusterMember[];
  /** Contains at least one human-validated duplicate_of link. */
  confirmed: boolean;
  band: ClusterBand;
}

/**
 * A solution cluster is always money already spent. An idea cluster depends on
 * whether anything in it has been delivered: a mix means the open members are
 * asking for what the solved one already has; all-solved means each duplicate
 * request got its own build, which is the same outcome as two flagged
 * solutions and belongs in the same band.
 */
function bandOf(
  docType: "idea" | "solution",
  group: Array<IdeaRecord | SolutionRecord>
): ClusterBand {
  if (docType === "solution") return "built-twice";
  const ideas = group as IdeaRecord[];
  const delivered = ideas.filter((i) => i.status === "solved").length;
  if (delivered === 0) return "none-built";
  if (delivered === ideas.length) return "built-twice";
  return "ask-answered";
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
      clusters.push({ docType, members, confirmed, band: bandOf(docType, group) });
    }
  };

  buildFor("idea");
  buildFor("solution");
  /**
   * Cheapest action first (v4.13), then the biggest cluster within a band —
   * a four-record overlap is worse than a pair and should lead its section.
   * The old sort was by docType, which ordered the queue by a fact about the
   * records rather than by anything the reader could act on.
   */
  return clusters.sort(
    (a, b) =>
      CLUSTER_BAND_ORDER.indexOf(a.band) - CLUSTER_BAND_ORDER.indexOf(b.band) ||
      b.members.length - a.members.length ||
      a.docType.localeCompare(b.docType)
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
  const unresolvedOld = unresolved.filter(
    (i) => agingBucket(ideaAgeDays(i.submitted_date, now), "idea") === "over 12 months"
  ).length;

  /**
   * The staleness headline (v4.8).
   *
   * This tile used to count only solutions that had never been reviewed, which
   * flattered the catalog: a solution reviewed once, fourteen months ago, is no
   * more dependable than one never reviewed at all, and it was counted as fine.
   * The number a reviewer actually needs is how much of the catalog nobody has
   * vouched for lately, because that is the share of "this already exists"
   * answers that could send someone to a dead artifact.
   */
  const unconfirmed = dataset.solutions.filter((s) => {
    const state = solutionFreshness(s, now);
    return state === "stale" || state === "unreviewed";
  }).length;
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
      subLabel: `${unresolvedOld} for over a year`,
    },
    {
      anchor: "aging",
      label: "Not confirmed working",
      value: unconfirmed,
      subLabel: `of ${plural(dataset.solutions.length, "solution")} — ${neverReviewed} never reviewed`,
    },
    {
      anchor: "duplicate-clusters",
      label: "Flagged for review",
      value: flagged,
      subLabel: `in ${plural(clusterCount, "cluster")}`,
    },
  ];
}

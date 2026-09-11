import {
  CLUSTER_BAND_ORDER,
  type ClusterBand,
  type ClusterMember,
  type DuplicateCluster,
} from "@/lib/governance";
import { findIdea, findSolution } from "@/lib/dataset";
import { matchLabel } from "@/lib/match-label";
import type { Dataset, SolutionRecord } from "@/lib/types";
import ClusterMembers, { type ClusterMemberView, type ClusterView } from "./ClusterMembers";
import MatchHelp from "@/components/search/MatchHelp";
import { artifactHref } from "@/lib/artifact-file";

interface Props {
  clusters: DuplicateCluster[];
  dataset: Dataset;
}

function oneLine(text: string, max = 200): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/**
 * Cross-link chips between cluster members. Per §3's relative-labeling
 * principle, any similarity signal is labeled against the top candidate score
 * in the cluster (the "result set" here), so labels spread meaningfully across
 * a cluster instead of every chip trivially reading "Strong match".
 */
function linksToMembers(
  cluster: DuplicateCluster,
  selfId: string,
  candScore: Map<string, number>,
  clusterTop: number
): Record<string, { score: number; label: string | null }> {
  const links: Record<string, { score: number; label: string | null }> = {};
  for (const other of cluster.members) {
    if (other.record.id === selfId) continue;
    const score = candScore.get(other.record.id);
    if (score !== undefined) {
      links[other.record.id] = { score, label: matchLabel(score, clusterTop) };
    }
  }
  return links;
}

function memberView(
  m: ClusterMember,
  cluster: DuplicateCluster,
  dataset: Dataset,
  clusterTop: number
): ClusterMemberView {
  const r = m.record;
  const candScore = new Map(r.duplicate_candidates.map((c) => [c.id, c.score] as const));

  // Best similarity this member has to any other member of its own cluster —
  // the number the row's match label is graded from.
  let bestInCluster: number | null = null;
  for (const other of cluster.members) {
    if (other.record.id === r.id) continue;
    const s = candScore.get(other.record.id);
    if (s !== undefined && (bestInCluster === null || s > bestInCluster)) bestInCluster = s;
  }

  const shared = {
    id: r.id,
    org: m.org,
    actorLabel: m.actorLabel,
    actorName: m.actorName,
    actorEmail: m.actorEmail,
    managerName: m.managerName ?? null,
    managerEmail: m.managerEmail ?? null,
    links: linksToMembers(cluster, r.id, candScore, clusterTop),
    matchLabel: bestInCluster === null ? null : matchLabel(bestInCluster, clusterTop),
  };

  if (r.doc_type === "idea") {
    const idea = r;
    const linked = idea.linked_solution_id
      ? findSolution(dataset, idea.linked_solution_id)
      : undefined;
    return {
      ...shared,
      title: idea.title,
      statusLabel: idea.status === "in_progress" ? "in progress" : idea.status,
      statusChipClass: `status-chip s-${idea.status}`,
      description: oneLine(idea.description),
      pending: idea.status !== "solved",
      artifactLink: null,
      // §4.3 line 3: the counterpart is named by title and linked. The raw id
      // that used to sit here was a §2.1 violation on a governance surface.
      relationLabel: linked ? "Solved" : null,
      relationTitle: linked ? linked.name : null,
      relationId: linked ? linked.id : null,
    };
  }

  const sol = r;
  const resolves = sol.resolves_idea_id ? findIdea(dataset, sol.resolves_idea_id) : undefined;
  return {
    ...shared,
    title: sol.name,
    statusLabel: sol.artifact_type,
    statusChipClass: "chip",
    description: oneLine(sol.ai_generated_summary ?? sol.raw_description),
    // A solution is the delivery; it is never the thing still being waited on.
    pending: false,
    artifactLink: artifactHref(sol.id),
    relationLabel: resolves ? "Resolves" : null,
    relationTitle: resolves ? resolves.title : null,
    relationId: resolves ? resolves.id : null,
  };
}

/**
 * The same overlap, told twice (v4.13).
 *
 * Detection runs separately over ideas and over solutions, which is right —
 * they are different texts and a request can read nothing like the thing
 * eventually built. But it means one real overlap can surface as several
 * clusters: in this dataset four duplicate meeting-notes requests appear as an
 * idea cluster of four AND as two solution pairs, because each request got its
 * own build and those builds are flagged against each other.
 *
 * Merging them would be wrong: the solution pairs are a finding on their own,
 * and a reader retiring a build needs to see it beside the other build, not
 * buried in a list of requests. Saying nothing would be worse, because the
 * band then reads as four separate problems when it is two.
 *
 * So they are cross-referenced. This finds, for a solution cluster, the idea
 * cluster its members' requests came from, when two or more of them share one.
 */
function crossReference(cluster: DuplicateCluster, all: DuplicateCluster[]): string | null {
  if (cluster.docType !== "solution") return null;

  const ideaClusterOf = new Map<string, DuplicateCluster>();
  for (const c of all) {
    if (c.docType !== "idea") continue;
    for (const m of c.members) ideaClusterOf.set(m.record.id, c);
  }

  const hits = new Map<DuplicateCluster, number>();
  for (const m of cluster.members) {
    if (m.record.doc_type !== "solution") continue;
    const sol = m.record as SolutionRecord;
    if (!sol.resolves_idea_id) continue;
    const ideaCluster = ideaClusterOf.get(sol.resolves_idea_id);
    if (ideaCluster) hits.set(ideaCluster, (hits.get(ideaCluster) ?? 0) + 1);
  }

  for (const [ideaCluster, n] of hits) {
    if (n < 2) continue;
    return `The requests behind these are flagged together too — they are ${ideaCluster.members.length} of the same ask, each closed with its own build.`;
  }
  return null;
}

function buildClusterView(
  cluster: DuplicateCluster,
  dataset: Dataset,
  all: DuplicateCluster[]
): ClusterView {
  // Similarity range shown in the cluster header (§4.3): only scores between
  // members of THIS cluster count, so a member's link to an outside candidate
  // cannot widen the range misleadingly.
  const ids = new Set(cluster.members.map((m) => m.record.id));
  const inCluster: number[] = [];
  for (const m of cluster.members) {
    for (const c of m.record.duplicate_candidates) {
      if (ids.has(c.id)) inCluster.push(c.score);
    }
  }
  const clusterTop = inCluster.length > 0 ? Math.max(...inCluster) : 0;
  const range =
    inCluster.length > 0
      ? { low: Math.min(...inCluster), high: clusterTop }
      : null;

  const members = cluster.members.map((m) => memberView(m, cluster, dataset, clusterTop));
  return {
    docType: cluster.docType,
    confirmed: cluster.confirmed,
    members,
    range,
    band: cluster.band,
    crossRef: crossReference(cluster, all),
  };
}

/**
 * What each band means and what to do about it (v4.13).
 *
 * The cost line is the point. Until now every cluster rendered identically, so
 * a request that could be closed in a minute looked exactly like two finished
 * builds that need consolidating — and the cheapest work on the page was
 * invisible inside a list of ten identical-looking cards.
 */
const BAND_COPY: Record<
  ClusterBand,
  { title: string; action: string; cost: string }
> = {
  "ask-answered": {
    title: "Already built, still being asked for",
    action:
      "Someone is waiting for something this catalog has. Close the request and point them at the build.",
    cost: "Costs nothing",
  },
  "none-built": {
    title: "Nothing built yet",
    action:
      "Every record here is still a request. Merging them now settles it before anyone funds two of them.",
    cost: "Cheapest to fix",
  },
  "built-twice": {
    title: "Built more than once",
    action:
      "The work has already been done twice. Consolidating or retiring one is real effort, and the saving is ongoing.",
    cost: "Money already spent",
  },
};

export default function DuplicateClusters({ clusters, dataset }: Props) {
  // Views are built server-side so no embeddings or raw user ids cross into
  // the client component; it only receives the flattened display fields.
  const views = clusters.map((c) => buildClusterView(c, dataset, clusters));
  const bands = CLUSTER_BAND_ORDER.map((band) => ({
    band,
    copy: BAND_COPY[band],
    items: views.filter((v) => v.band === band),
  })).filter((b) => b.items.length > 0);

  const records = views.reduce((n, v) => n + v.members.length, 0);

  return (
    <section className="widget wide" id="duplicate-clusters">
      <h2>Overlaps to review</h2>
      <p className="widget-sub">
        {views.length} groups holding {records} records, detected offline and
        awaiting review — nothing is merged automatically. Grouped by what to do
        about them, cheapest first. Open a record for its summary, or jump to
        its card on the catalog board.
      </p>
      <MatchHelp variant="cluster" />
      {views.length === 0 ? (
        <div className="empty-state" style={{ boxShadow: "none" }}>
          <p>No overlaps found in this dataset.</p>
          <p>
            That means nothing was flagged as similar to anything else — either
            the catalog is genuinely distinct or the detection threshold needs
            another look.
          </p>
        </div>
      ) : (
        bands.map(({ band, copy, items }) => (
          <div className={`cluster-band b-${band}`} key={band}>
            <div className="band-head">
              <h3 className="band-title">
                {copy.title}
                <span className="band-count">{items.length}</span>
              </h3>
              <span className="band-cost">{copy.cost}</span>
            </div>
            <p className="band-action">{copy.action}</p>
            <div className="cluster-list">
              {items.map((view, idx) => (
                <ClusterMembers key={`${band}-${idx}`} cluster={view} />
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

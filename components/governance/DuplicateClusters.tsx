import type { ClusterMember, DuplicateCluster } from "@/lib/governance";
import { findIdea, findSolution } from "@/lib/dataset";
import { matchLabel } from "@/lib/match-label";
import type { Dataset } from "@/lib/types";
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
    artifactLink: artifactHref(sol.id),
    relationLabel: resolves ? "Resolves" : null,
    relationTitle: resolves ? resolves.title : null,
    relationId: resolves ? resolves.id : null,
  };
}

function buildClusterView(cluster: DuplicateCluster, dataset: Dataset): ClusterView {
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
  return { docType: cluster.docType, confirmed: cluster.confirmed, members, range };
}

export default function DuplicateClusters({ clusters, dataset }: Props) {
  // Views are built server-side so no embeddings or raw user ids cross into
  // the client component; it only receives the flattened display fields.
  const views = clusters.map((c) => buildClusterView(c, dataset));
  return (
    <section className="widget wide" id="duplicate-clusters">
      <h2>Duplicate clusters</h2>
      <p className="widget-sub">
        Records flagged as similar to each other, detected offline and awaiting
        review — nothing is merged automatically. Open a record for its summary,
        or jump to its card on the catalog board.
      </p>
      <MatchHelp variant="cluster" />
      {views.length === 0 ? (
        <div className="empty-state" style={{ boxShadow: "none" }}>
          <p>No duplicate clusters in this dataset.</p>
          <p>
            That means nothing was flagged as similar to anything else — either
            the catalog is genuinely distinct or the detection threshold needs
            another look.
          </p>
        </div>
      ) : (
        <div className="cluster-list">
          {views.map((view, idx) => (
            <ClusterMembers key={`${view.docType}-${idx}`} cluster={view} />
          ))}
        </div>
      )}
    </section>
  );
}

import type { ClusterMember, DuplicateCluster } from "@/lib/governance";
import { findIdea, findSolution } from "@/lib/dataset";
import { matchLabel } from "@/lib/match-label";
import type { Dataset } from "@/lib/types";
import ClusterMembers, { type ClusterMemberView, type ClusterView } from "./ClusterMembers";

interface Props {
  clusters: DuplicateCluster[];
  dataset: Dataset;
}

/** Deterministic synthetic address — users.json carries no email field (§4.4 allows synthetic emails). */
function syntheticEmail(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .replace(/\s+/g, ".");
  return `${slug}@gbs.example`;
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

  const shared = {
    id: r.id,
    org: m.org,
    actorLabel: m.actorLabel,
    actorName: m.actorName,
    actorEmail: syntheticEmail(m.actorName),
    managerName: m.managerName ?? null,
    managerEmail: m.managerName ? syntheticEmail(m.managerName) : null,
    links: linksToMembers(cluster, r.id, candScore, clusterTop),
  };

  if (r.doc_type === "idea") {
    const idea = r;
    const linked = idea.linked_solution_id
      ? findSolution(dataset, idea.linked_solution_id)
      : undefined;
    const notes: string[] = [];
    if (idea.status === "solved") notes.push("solved");
    if (linked) notes.push(`linked solution: ${linked.name}`);
    return {
      ...shared,
      title: idea.title,
      statusLabel: idea.status === "in_progress" ? "in progress" : idea.status,
      statusChipClass: `status-chip s-${idea.status}`,
      description: oneLine(idea.description),
      artifactLink: null,
      linkedNote: notes.join(" — ") || null,
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
    artifactLink: sol.artifact_link,
    linkedNote: sol.resolves_idea_id
      ? `resolves ${sol.resolves_idea_id}${resolves ? ` — ${resolves.title}` : ""}`
      : "no linked idea",
  };
}

function buildClusterView(cluster: DuplicateCluster, dataset: Dataset): ClusterView {
  let clusterTop = 0;
  for (const m of cluster.members) {
    for (const c of m.record.duplicate_candidates) {
      if (c.score > clusterTop) clusterTop = c.score;
    }
  }
  const members = cluster.members.map((m) => memberView(m, cluster, dataset, clusterTop));
  return { docType: cluster.docType, confirmed: cluster.confirmed, members };
}

export default function DuplicateClusters({ clusters, dataset }: Props) {
  // Views are built server-side so no embeddings or raw user ids cross into
  // the client component; it only receives the flattened display fields.
  const views = clusters.map((c) => buildClusterView(c, dataset));
  return (
    <section className="widget wide">
      <h2>Duplicate clusters</h2>
      <p className="widget-sub">
        Groups of records flagged as similar to each other, detected offline and
        awaiting review — nothing is merged automatically. Click a record (or an
        &ldquo;also flagged with&rdquo; chip) for an inline summary. Idea clusters show
        the submitter and their manager; solution clusters show the solution owner.
      </p>
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
        views.map((view, idx) => (
          <ClusterMembers key={`${view.docType}-${idx}`} cluster={view} />
        ))
      )}
    </section>
  );
}

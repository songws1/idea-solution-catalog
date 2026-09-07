"use client";

import type { ClientScoredResult } from "@/lib/types";
import { matchLabel } from "@/lib/match-label";
import DuplicateBadge from "./DuplicateBadge";

/**
 * One card in a Kanban column (Addendum A §2.1-§2.3). Two shapes:
 *  - idea card (Idea / In progress columns) — may carry a "likely already
 *    solved" indicator (§2.3) that jumps to the solution card it points at;
 *  - solution cluster card (Solution column) — solution summary + artifact
 *    link + any solved ideas clustered into it, as one card, not two.
 *
 * Match-quality label reuses matchLabel()/topScoreOf() from lib/match-label —
 * the shared §3 scale, not a new encoding.
 */

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface Props {
  item: ClientScoredResult;
  topScore: number;
  /** Set when §2.3's duplicate-candidate rule flags this idea as likely solved. */
  likelySolved?: string;
  /** Solved ideas clustered into this solution card (§2.2, one card not two). */
  clusterIdeas?: ClientScoredResult[];
  onOpen: (item: ClientScoredResult) => void;
  onJumpToSolution: (solutionId: string) => void;
  /** Duplicate-candidate contract: jump to the record's tile, drawer last resort. */
  onJumpToDuplicate: (id: string) => void;
}

export default function KanbanCard({
  item,
  topScore,
  likelySolved,
  clusterIdeas,
  onOpen,
  onJumpToSolution,
  onJumpToDuplicate,
}: Props) {
  const { record, score, via_link } = item;
  const label = matchLabel(score, topScore);
  const labelClass =
    label === "Strong match" ? " m-strong" : label === "Related" ? " m-related" : "";
  const classes = ["card", via_link ? "via-link" : ""].filter(Boolean).join(" ");

  if (record.doc_type === "idea") {
    const idea = record;
    return (
      <article
        className={classes}
        data-record-id={record.id}
        onClick={() => onOpen(item)}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(item);
          }
        }}
      >
        <div className="card-topline">
          <span className={`status-chip s-${record.status}`}>
            {record.status === "in_progress" ? "in progress" : record.status}
          </span>
          <span
            className={`card-score${labelClass}`}
            title={`${label ? `${label} — ` : ""}${score.toFixed(2)} cosine similarity to your question`}
          >
            {label ?? score.toFixed(2)}
          </span>
        </div>
        <h3>{record.title}</h3>
        <p className="card-meta">
          {/* stored `org` renders as "Service", stored `service` as "Sub-service" (v3 §1). */}
          Service: {record.org}; Sub-service: {record.service} — submitted by{" "}
          {record.submitted_by_name} on {fmtDate(record.submitted_date)}
        </p>
        <p className="card-desc">{record.description}</p>
        {via_link && <p className="via-link-note">shown via its linked counterpart</p>}
        {likelySolved && (
          <button
            type="button"
            className="likely-solved"
            onClick={(e) => {
              e.stopPropagation();
              onJumpToSolution(likelySolved);
            }}
            title="Jump to the matching solution card"
          >
            Likely already solved — jump to the solution
          </button>
        )}
        <DuplicateBadge record={record} onNavigate={onJumpToDuplicate} />
      </article>
    );
  }

  return (
    <article
      className="card kanban-sol-card"
      data-record-id={record.id}
      onClick={() => onOpen(item)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(item);
        }
      }}
    >
      <div className="card-topline">
        <span className="chip">{record.artifact_type}</span>
        <span className="sol-tech">{record.technology_type}</span>
        <span
          className={`card-score${labelClass}`}
          title={`${label ? `${label} — ` : ""}${score.toFixed(2)} cosine similarity to your question`}
        >
          {label ?? score.toFixed(2)}
        </span>
      </div>
      <h3>{record.name}</h3>
      <p className="card-desc">
        {record.ai_generated_summary ?? record.raw_description}
      </p>
      {record.category_tags.length > 0 && (
        <div className="tag-row">
          {record.category_tags.map((tag) => (
            <span key={tag} className="chip">
              {tag}
            </span>
          ))}
        </div>
      )}
      <a
        className="artifact-link"
        href={record.artifact_link}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        Open the artifact
      </a>
      {clusterIdeas && clusterIdeas.length > 0 && (
        <div className="cluster-ideas">
          <p className="enriched-label">Resolved idea{clusterIdeas.length === 1 ? "" : "s"}</p>
          {clusterIdeas.map((ir) =>
            ir.record.doc_type === "idea" ? (
              <div key={ir.record.id} className="cluster-idea">
                <p className="cluster-idea-title">{ir.record.title}</p>
                <p className="cluster-idea-desc">{ir.record.description}</p>
                {ir.record.solution_summary && (
                  <p className="cluster-idea-summary">{ir.record.solution_summary}</p>
                )}
              </div>
            ) : null
          )}
        </div>
      )}
      {via_link && <p className="via-link-note">shown via its linked counterpart</p>}
      <DuplicateBadge record={record} onNavigate={onJumpToDuplicate} />
    </article>
  );
}
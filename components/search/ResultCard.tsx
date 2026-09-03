"use client";

import type { DatasetVariant, ClientScoredResult } from "@/lib/types";
import { matchLabel } from "@/lib/match-label";
import DuplicateBadge from "./DuplicateBadge";

interface Props {
  item: ClientScoredResult;
  /** Top score across the current result set (ideas + solutions combined) — §3. */
  topScore: number;
  selected: boolean;
  linkedActive: boolean;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  variant: DatasetVariant;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ResultCard({
  item,
  topScore,
  selected,
  linkedActive,
  onSelect,
  onHover,
  variant,
}: Props) {
  const { record, score, via_link } = item;
  // §3: label is relative to the top score in the current result set; the raw
  // cosine stays available on hover. Below the 0.15 noise floor no label is
  // shown and the quiet raw score stands in.
  const label = matchLabel(score, topScore);
  const labelClass =
    label === "Strong match" ? " m-strong" : label === "Related" ? " m-related" : "";
  const classes = [
    "card",
    selected ? "selected" : "",
    linkedActive && !selected ? "linked-active" : "",
    via_link ? "via-link" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleSelect = () => {
    onSelect(selected ? null : record.id);
  };

  const topline = (
    <div className="card-topline">
      {record.doc_type === "idea" ? (
        <span className={`status-chip s-${record.status}`}>
          {record.status === "in_progress" ? "in progress" : record.status}
        </span>
      ) : (
        <span className="chip">{record.artifact_type}</span>
      )}
      {via_link && <span className="via-link-note">shown via its linked counterpart</span>}
      <span
        className={`card-score${labelClass}`}
        title={`${label ? `${label} — ` : ""}${score.toFixed(2)} cosine similarity to your question`}
      >
        {label ?? score.toFixed(2)}
      </span>
    </div>
  );

  if (record.doc_type === "idea") {
    return (
      <article
        className={classes}
        data-record-id={record.id}
        onClick={handleSelect}
        onMouseEnter={() => onHover(record.id)}
        onMouseLeave={() => onHover(null)}
        tabIndex={0}
        role="button"
        aria-pressed={selected}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSelect();
          }
        }}
      >
        {topline}
        <h3>{record.title}</h3>
        <p className="card-meta">
          {record.org} · {record.service} — submitted by {record.submitted_by_name} on{" "}
          {fmtDate(record.submitted_date)}
        </p>
        <p className="card-desc">{record.description}</p>
        {variant === "post" && record.solution_summary && (
          <div className="enriched-note">
            <p className="enriched-label">
              Linked solution (written back from the built artifact)
            </p>
            <p>{record.solution_summary}</p>
          </div>
        )}
        <DuplicateBadge record={record} />
      </article>
    );
  }

  return (
    <article
      className={classes}
      data-record-id={record.id}
      onClick={handleSelect}
      onMouseEnter={() => onHover(record.id)}
      onMouseLeave={() => onHover(null)}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleSelect();
        }
      }}
    >
      {topline}
      <h3>{record.name}</h3>
      <p className="card-meta">
        Owner {record.solution_owner_name} — built {fmtDate(record.date_built)}
        {record.resolves_idea_id ? ` — resolves ${record.resolves_idea_id}` : " — no linked idea"}
      </p>
      <p className="card-desc">{record.ai_generated_summary ?? record.raw_description}</p>
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
      <DuplicateBadge record={record} />
    </article>
  );
}

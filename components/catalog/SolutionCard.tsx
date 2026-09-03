"use client";

import type { ClientSolution } from "@/lib/types";
import type { SolutionMeta } from "@/lib/catalog-filters";

/**
 * One solution card in the landing grid (Addendum A §1.2). Tag pills are
 * clickable — clicking one sets the Taxonomy filter and scrolls to top
 * (§1.4, fixes UAT issue #4). Clicking the card opens the shared §2.4 detail.
 */

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface Props {
  sol: ClientSolution;
  meta?: SolutionMeta;
  onOpen: (sol: ClientSolution) => void;
  onTagClick: (tag: string) => void;
}

export default function SolutionCard({ sol, meta, onOpen, onTagClick }: Props) {
  return (
    <article
      className="sol-card"
      data-record-id={sol.id}
      onClick={() => onOpen(sol)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(sol);
        }
      }}
    >
      <div className="card-topline">
        <span className="chip">{sol.artifact_type}</span>
        <span className="sol-tech">{sol.technology_type}</span>
      </div>
      <h3>{sol.name}</h3>
      <p className="sol-summary">{sol.ai_generated_summary ?? sol.raw_description}</p>
      {sol.category_tags.length > 0 && (
        <div className="tag-row">
          {sol.category_tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="chip tag-pill"
              title={`Filter the catalog to "${tag}"`}
              onClick={(e) => {
                e.stopPropagation();
                onTagClick(tag);
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      <p className="card-meta">
        Owner {sol.solution_owner_name} — {meta?.org ?? "Unassigned"}
        {meta?.service ? `, ${meta.service}` : ""} — built {fmtDate(sol.date_built)}
      </p>
    </article>
  );
}
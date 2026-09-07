"use client";

import type { ClientIdea, ClientRecord, ClientSolution } from "@/lib/types";
import type { SolutionMetaMap } from "@/lib/catalog-filters";
import SolutionCard from "./SolutionCard";

/**
 * Box-based catalog browse grid (Addendum A §1.2): solutions primarily;
 * ideas without a solution in a secondary "open ideas" section below.
 * Empty filter results state the applied filters plainly and offer to clear
 * them (§1.2, per base spec §12's empty-state principle).
 */

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface Props {
  solutions: ClientSolution[];
  meta: SolutionMetaMap;
  openIdeas: ClientIdea[];
  onOpen: (record: ClientRecord) => void;
  onTagClick: (tag: string) => void;
  activeFilterDescriptions: string[];
  onClearFilters: () => void;
}

export default function CatalogGrid({
  solutions,
  meta,
  openIdeas,
  onOpen,
  onTagClick,
  activeFilterDescriptions,
  onClearFilters,
}: Props) {
  if (solutions.length === 0 && openIdeas.length === 0) {
    return (
      <div className="empty-state" style={{ marginTop: 24 }}>
        <p>No records match the current filters.</p>
        {activeFilterDescriptions.length > 0 && (
          <ul className="active-filter-list">
            {activeFilterDescriptions.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
        <p>
          <button type="button" className="filter-clear" onClick={onClearFilters}>
            Clear all filters
          </button>
        </p>
      </div>
    );
  }

  return (
    <div>
      <section aria-label="Solutions in the catalog">
        <h2 className="catalog-section-title">
          Solutions
          <span className="count">
            {solutions.length} built solution{solutions.length === 1 ? "" : "s"}
          </span>
        </h2>
        {solutions.length > 0 ? (
          <div className="catalog-grid">
            {solutions.map((sol) => (
              <SolutionCard
                key={sol.id}
                sol={sol}
                meta={meta[sol.id]}
                onOpen={onOpen}
                onTagClick={onTagClick}
              />
            ))}
          </div>
        ) : (
          <p className="catalog-none">
            No solutions match the current filters — open ideas are listed below.
          </p>
        )}
      </section>

      {openIdeas.length > 0 && (
        <section aria-label="Open ideas" className="open-ideas-section">
          <h2 className="catalog-section-title">
            Open ideas
            <span className="count">
              {openIdeas.length} not yet solved
            </span>
          </h2>
          <div className="idea-list">
            {openIdeas.map((idea) => (
              <article
                key={idea.id}
                className="idea-row"
                data-record-id={idea.id}
                onClick={() => onOpen(idea)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(idea);
                  }
                }}
              >
                <div className="card-topline">
                  <span className={`status-chip s-${idea.status}`}>
                    {idea.status === "in_progress" ? "in progress" : idea.status}
                  </span>
                  <span className="idea-id">{idea.id}</span>
                </div>
                <h3>{idea.title}</h3>
                <p className="idea-desc">{idea.description}</p>
                <p className="card-meta">
                  {/* stored `org` renders as "Service", stored `service` as "Sub-service" (v3 §1). */}
                  Service: {idea.org}; Sub-service: {idea.service} — submitted by{" "}
                  {idea.submitted_by_name} on {fmtDate(idea.submitted_date)}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
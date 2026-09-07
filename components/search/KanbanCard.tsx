"use client";

import type { ReactNode } from "react";
import type { BoardItem } from "@/lib/types";
import { matchLabel } from "@/lib/match-label";
import type { SolutionMetaMap } from "@/lib/catalog-filters";
import DuplicateBadge from "./DuplicateBadge";

/**
 * One card on the Kanban board (v3 §3.3) — three zones in one bordered
 * surface: a header band tinted with the column's status tint, a body
 * (title / 3-line-clamped summary / tag row / duplicate strip / Resolves
 * strip / actions), and a two-line footer (who + when; Service + Sub-service
 * as clickable facets). Two shapes:
 *  - idea card (Idea / In progress columns);
 *  - solution card (Solution column) — the resolved idea appears ONLY as the
 *    one-line `Resolves` strip (title as a link, §3.4): the nested
 *    "Resolved idea" block that printed the solution's own summary twice is
 *    gone, not truncated.
 *
 * The match label renders only in search mode (score present) and reuses
 * matchLabel()/topScoreOf() — the shared §3 scale, not a new encoding.
 */

export type BoardColumn = "idea" | "review" | "solution";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const TYPE_ICONS: Record<string, ReactNode> = {
  prompt: (
    <>
      <path d="M3.5 1.5h5l2.5 2.5v8.5h-7.5z" />
      <path d="M5.5 7h3.5M5.5 9.5h3.5" />
    </>
  ),
  skill: <path d="M7.5 1.5L3 8h3.5l-.5 4.5L11 6H7z" />,
  automation: (
    <>
      <circle cx="7" cy="7" r="2.2" />
      <path d="M7 1.8v2M7 10.2v2M1.8 7h2M10.2 7h2M3.4 3.4l1.4 1.4M9.2 9.2l1.4 1.4M10.6 3.4L9.2 4.8M4.8 9.2l-1.4 1.4" />
    </>
  ),
};

function CheckIcon() {
  return (
    <svg
      className="strip-icon"
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 7.5l3 3 6-6" />
    </svg>
  );
}

interface Props {
  item: BoardItem;
  /** Which column the card sits in — drives the header band tint (§3.3). */
  column: BoardColumn;
  topScore?: number;
  /** Set when §2.3's duplicate-candidate rule flags this idea as likely solved. */
  likelySolved?: string;
  /** Solved ideas clustered into this solution card — rendered as Resolves lines only. */
  clusterIdeas?: BoardItem[];
  onOpen: (item: BoardItem) => void;
  onJumpToSolution: (solutionId: string) => void;
  /** Duplicate-candidate contract: jump to the record's tile, drawer last resort. */
  onJumpToDuplicate: (id: string) => void;
  /** Jump to a record's tile wherever rendered (Resolves title links). */
  onNavigate: (id: string) => void;
  /** Resolved service/sub-service per solution id (footer facets). */
  solutionMeta?: SolutionMetaMap;
  /** Footer facet click: filter by this value (§2.2 third case). */
  onFacetClick: (facet: "orgs" | "services", value: string) => void;
  /** Record id → display title/name (duplicate strips cite titles, not ids — §2.1). */
  titleOf: (id: string) => string | undefined;
}

export default function KanbanCard({
  item,
  column,
  topScore,
  likelySolved,
  clusterIdeas,
  onOpen,
  onJumpToSolution,
  onJumpToDuplicate,
  onNavigate,
  solutionMeta,
  onFacetClick,
  titleOf,
}: Props) {
  const { record, score, via_link } = item;
  const label =
    score !== undefined && topScore !== undefined ? matchLabel(score, topScore) : null;
  const labelClass =
    label === "Strong match" ? " m-strong" : label === "Related" ? " m-related" : "";
  const classes = ["board-card", via_link ? "via-link" : ""].filter(Boolean).join(" ");

  const bandLabel = label ?? (score !== undefined ? score.toFixed(2) : null);

  const facet = (facetKey: "orgs" | "services", value: string, label: string) =>
    value && value !== "Unassigned" ? (
      <button
        type="button"
        className="facet-link"
        title={`Filter the board to ${value}`}
        onClick={(e) => {
          e.stopPropagation();
          onFacetClick(facetKey, value);
        }}
      >
        {value}
      </button>
    ) : (
      <span>{label}</span>
    );

  const foot = (() => {
    if (record.doc_type === "idea") {
      return {
        who: record.submitted_by_name,
        date: fmtDate(record.submitted_date),
        org: record.org,
        service: record.service,
      };
    }
    const meta = solutionMeta?.[record.id];
    return {
      who: `${record.solution_owner_name}`,
      date: fmtDate(record.date_built),
      org: meta?.org ?? "Unassigned",
      service: meta?.service ?? "Unassigned",
    };
  })();

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
      <div className={`card-band band-${column}`}>
        {record.doc_type === "idea" ? (
          <span className={`band-status status-${record.status}`}>
            {record.status === "in_progress" ? "In progress" : "Open"}
          </span>
        ) : (
          <>
            <svg
              className="strip-icon"
              width="13"
              height="13"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {TYPE_ICONS[record.artifact_type] ?? TYPE_ICONS.automation}
            </svg>
            <span className="band-type">{record.artifact_type}</span>
            <span className="band-rule" aria-hidden="true" />
            <span className="band-tech">{record.technology_type}</span>
          </>
        )}
        {bandLabel && (
          <span
            className={`card-score${labelClass}`}
            title={`${label ? `${label} — ` : ""}${(score ?? 0).toFixed(2)} cosine similarity to your question`}
          >
            {bandLabel}
          </span>
        )}
      </div>

      <div className="card-body">
        <h3>{record.doc_type === "idea" ? record.title : record.name}</h3>
        <p className="card-summary">
          {record.doc_type === "idea"
            ? record.description
            : (record.ai_generated_summary ?? record.raw_description)}
        </p>

        {(() => {
          const tags = record.doc_type === "idea" ? record.solution_tags : record.category_tags;
          return tags.length > 0 ? (
            <div className="tag-row">
              {tags.map((tag) => (
                <span key={tag} className="value-tag">
                  {tag}
                </span>
              ))}
            </div>
          ) : null;
        })()}

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

        <DuplicateBadge record={record} onNavigate={onJumpToDuplicate} titleOf={titleOf} />

        {record.doc_type === "solution" &&
          clusterIdeas?.map((ir) =>
            ir.record.doc_type === "idea" ? (
              // v3 §3.4: title only, one line — the idea's text lives in the drawer.
              <div key={ir.record.id} className="resolves-strip">
                <CheckIcon />
                <span className="resolves-word">Resolves</span>
                <button
                  type="button"
                  className="resolves-link"
                  title="Open this idea's detail"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(ir.record.id);
                  }}
                >
                  {ir.record.title}
                </button>
              </div>
            ) : null
          )}

        {record.doc_type === "solution" && (
          <div className="card-actions">
            <a
              className="btn-primary"
              href={record.artifact_link}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              Open the artifact
            </a>
            {/* Inert by design — wired in the employee-directory phase (v3 §7). */}
            <button
              type="button"
              className="btn-secondary"
              onClick={(e) => e.stopPropagation()}
            >
              Contact owner
            </button>
          </div>
        )}
      </div>

      <div className="card-foot">
        <div className="foot-line">
          <span>{foot.who}</span>
          <span className="foot-date">{foot.date}</span>
        </div>
        <div className="foot-line foot-facets">
          {/* stored `org` renders as "Service", stored `service` as "Sub-service" (v3 §1). */}
          <span>
            Service: {facet("orgs", foot.org, "Unassigned")}; Sub-service:{" "}
            {facet("services", foot.service, "Unassigned")}
          </span>
        </div>
      </div>
    </article>
  );
}

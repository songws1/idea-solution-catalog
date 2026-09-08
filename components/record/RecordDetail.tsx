"use client";

import { matchLabel } from "@/lib/match-label";
import type { SolutionMetaMap } from "@/lib/catalog-filters";
import type { ClientIdea, ClientRecord, ClientSolution } from "@/lib/types";
import { mailtoFor } from "@/lib/contact";
import { artifactHref } from "@/lib/artifact-file";

/**
 * The ONE shared card-detail treatment (Addendum A §2.4), used by the Kanban
 * board and (later) the governance duplicate clusters and the graph view —
 * not one detail UI per screen.
 *
 * All actions are real (fixes UAT #5 and #7):
 *  - "Download the artifact" is a primary button (solutions) and now
 *    serves a real generated file, not the sharepoint.example placeholder.
 *  - "View linked idea / solution" jumps to (scrolls + highlights) the paired
 *    card wherever it is in the current view; onNavigate falls back to opening
 *    that record's detail when no card is rendered for it.
 *  - Duplicate candidates are real links using the jump-to-tile contract
 *    (onJumpToDuplicate): land on the record's tile on the board —
 *    clearing search/filters to reach the full browse board when needed — and
 *    only open the candidate's detail when no tile can exist anywhere.
 *  - NO "flag as reviewed" / "Not a duplicate" action — explicitly out of
 *    scope (§2.4; no write-back store exists).
 *
 * Match-quality label comes from the shared matchLabel() scale (§3) and is
 * shown only when the record was opened from a scored search-results context.
 * When an idea has a linked solution (or a solution a linked idea), the
 * counterpart's basic identity (name/title, org) is shown inline above the
 * "View linked …" action (Phase 4.1 #2), backed by the ideasById/solutionsById
 * lookups.
 */

/**
 * A person's name, rendered as a contact link when the directory resolved an
 * address for them and as plain text when it did not. A dead mailto is worse
 * than no affordance at all.
 */
function Contact({
  name,
  email,
  title,
}: {
  name: string;
  email: string | null;
  title: string;
}) {
  if (!email) return <>{name}</>;
  return (
    <a
      className="contact-link"
      href={mailtoFor(email, title)}
      title={`Email ${name} about this record (synthetic demo address)`}
    >
      {name}
    </a>
  );
}

export interface DetailRecord {
  record: ClientRecord;
  /** Present only when opened from search results (scored context). */
  score?: number;
  topScore?: number;
  viaLink?: boolean;
}

interface Props {
  detail: DetailRecord;
  onClose: () => void;
  /** Jump to a record's card if one is rendered; open its detail otherwise. */
  onNavigate: (id: string) => void;
  /** Duplicate-candidate contract: jump to the record's tile, drawer last resort. */
  onJumpToDuplicate: (id: string) => void;
  /** Clicking a tag pill filters the grid to that tag (§1.4). */
  onTagClick: (tag: string) => void;
  /** Resolved org/service per solution id (server-computed, §1.3). */
  solutionMeta?: SolutionMetaMap;
  /** Dataset lookups backing the inline linked-record info line (Phase 4.1 #2). */
  ideasById?: Record<string, ClientIdea>;
  solutionsById?: Record<string, ClientSolution>;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function DuplicateDisclosure({
  record,
  onJumpToDuplicate,
  titleOf,
}: {
  record: ClientRecord;
  onJumpToDuplicate: (id: string) => void;
  /** Record id → display title/name: candidates cite titles, not raw ids (v3 §2.1). */
  titleOf: (id: string) => string | undefined;
}) {
  const candidates = record.duplicate_candidates;
  if (candidates.length === 0 && !record.duplicate_of) return null;
  return (
    <details className="dup-details">
      <summary>
        {candidates.length} similar record{candidates.length === 1 ? "" : "s"} flagged for
        review{record.duplicate_of ? " — confirmed duplicate link" : ""}
      </summary>
      <ul>
        {record.duplicate_of && (
          <li>
            <button
              type="button"
              className="dup-link"
              onClick={() => onJumpToDuplicate(record.duplicate_of as string)}
              title="Go to this record"
            >
              {titleOf(record.duplicate_of) ?? record.duplicate_of}
            </button>{" "}
            (confirmed duplicate, human-validated)
          </li>
        )}
        {candidates.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className="dup-link"
              onClick={() => onJumpToDuplicate(c.id)}
              title="Go to this record"
            >
              {titleOf(c.id) ?? c.id}
            </button>{" "}
            — similarity {c.score.toFixed(2)}
          </li>
        ))}
      </ul>
      <p className="dup-hint">Click a flagged record to jump to it.</p>
    </details>
  );
}

export default function RecordDetail({
  detail,
  onClose,
  onNavigate,
  onJumpToDuplicate,
  onTagClick,
  solutionMeta,
  ideasById,
  solutionsById,
}: Props) {
  const { record, score, topScore } = detail;
  const label = score !== undefined && topScore !== undefined ? matchLabel(score, topScore) : null;

  let linkedId: string | null = null;
  let linkedLabel = "";
  if (record.doc_type === "idea") {
    const idea = record as ClientIdea;
    linkedId = idea.linked_solution_id ?? idea.solution_link;
    linkedLabel = "View linked solution";
  } else {
    linkedId = (record as ClientSolution).resolves_idea_id;
    linkedLabel = "View linked idea";
  }

  const idea = record.doc_type === "idea" ? (record as ClientIdea) : null;
  const sol = record.doc_type === "solution" ? (record as ClientSolution) : null;
  const meta = sol && solutionMeta ? solutionMeta[sol.id] : undefined;
  const tags = idea ? idea.solution_tags : (sol as ClientSolution).category_tags;

  // Inline identity of the linked counterpart (Phase 4.1 #2): problem phrasing
  // on one side, artifact-style name on the other — name/title + org is the
  // minimum needed to know what "View linked …" will land on.
  let linkedInfo: string | null = null;
  if (linkedId) {
    if (idea) {
      const linkedSol = solutionsById?.[linkedId];
      if (linkedSol) {
        linkedInfo = `Linked solution: ${linkedSol.name} (${
          solutionMeta?.[linkedSol.id]?.org ?? "Unassigned"
        })`;
      }
    } else {
      const linkedIdea = ideasById?.[linkedId];
      if (linkedIdea) {
        linkedInfo = `Linked idea: ${linkedIdea.title} (${linkedIdea.org})`;
      }
    }
  }

  // Record id → display title/name for the duplicate disclosure (v3 §2.1:
  // clickable references cite the title; the record's own id stays in the
  // muted line below).
  const titleOf = (id: string) => ideasById?.[id]?.title ?? solutionsById?.[id]?.name;

  return (
    <div className="detail-body">
      <div className="card-topline">
        {idea ? (
          <span className={`status-chip s-${idea.status}`}>
            {idea.status === "in_progress" ? "in progress" : idea.status}
          </span>
        ) : (
          <span className="chip">{(sol as ClientSolution).artifact_type}</span>
        )}
        {label && (
          <span
            className={`card-score${label === "Strong match" ? " m-strong" : label === "Related" ? " m-related" : ""}`}
            title={`${label} — ${score?.toFixed(2)} cosine similarity to your question`}
          >
            {label}
          </span>
        )}
        <button type="button" className="detail-close" onClick={onClose} aria-label="Close details">
          Close
        </button>
      </div>

      <h2 className="detail-title">{idea ? idea.title : (sol as ClientSolution).name}</h2>
      <p className="detail-id">{record.id}</p>

      {idea ? (
        <>
          <p className="detail-desc">{idea.description}</p>
          {idea.notes && (
            <p className="detail-notes">
              <span className="enriched-label">Portal notes: </span>
              {idea.notes}
            </p>
          )}
          {idea.solution_summary && (
            <div className="enriched-note">
              <p className="enriched-label">
                Linked solution (written back from the built artifact)
              </p>
              <p>{idea.solution_summary}</p>
            </div>
          )}
        </>
      ) : (
        <p className="detail-desc">
          {(sol as ClientSolution).ai_generated_summary ?? (sol as ClientSolution).raw_description}
        </p>
      )}

      {tags.length > 0 && (
        <div className="tag-row">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="chip tag-pill"
              title={`Filter the catalog to "${tag}"`}
              onClick={() => onTagClick(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="detail-meta">
        {/* stored `org` renders as "Service", stored `service` as "Sub-service" (v3 §1). */}
        {idea ? (
          <>
            <span>
              Service: {idea.org}; Sub-service: {idea.service}
            </span>
            <span>
              Submitted by{" "}
              <Contact
                name={idea.submitted_by_name}
                email={idea.submitted_by_email}
                title={idea.title}
              />
              {idea.submitted_by_manager_name ? (
                <>
                  {" "}(manager:{" "}
                  <Contact
                    name={idea.submitted_by_manager_name}
                    email={idea.submitted_by_manager_email}
                    title={idea.title}
                  />
                  )
                </>
              ) : null}{" "}
              on {fmtDate(idea.submitted_date)}
            </span>
          </>
        ) : (
          <>
            <span>
              {meta
                ? `Service: ${meta.org}; Sub-service: ${meta.service}`
                : "Service unassigned"}
            </span>
            <span>
              Owner{" "}
              <Contact
                name={sol?.solution_owner_name ?? ""}
                email={sol?.solution_owner_email ?? null}
                title={sol?.name ?? ""}
              />{" "}
              — built by{" "}
              <Contact
                name={sol?.built_by_name ?? ""}
                email={sol?.built_by_email ?? null}
                title={sol?.name ?? ""}
              />{" "}
              on {fmtDate(sol?.date_built ?? null)}
              {sol?.date_last_reviewed
                ? ` — last reviewed ${fmtDate(sol.date_last_reviewed)}`
                : " — never reviewed"}
            </span>
          </>
        )}
      </div>

      <DuplicateDisclosure
        record={record}
        onJumpToDuplicate={onJumpToDuplicate}
        titleOf={titleOf}
      />

      {linkedInfo && <p className="linked-record-info">{linkedInfo}</p>}

      <div className="detail-actions">
        {sol && (
          <a className="btn-primary" href={artifactHref(sol.id)} download>
            Download the artifact
          </a>
        )}
        {linkedId && (
          <button type="button" className="btn-secondary" onClick={() => onNavigate(linkedId)}>
            {linkedLabel}
          </button>
        )}
      </div>
    </div>
  );
}
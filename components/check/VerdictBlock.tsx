"use client";

import { mailtoFor } from "@/lib/contact";
import { artifactHref } from "@/lib/artifact-file";
import { VERDICT_COPY, type OverlapMatch, type OverlapResult } from "@/lib/overlap";
import type { ClientIdea, ClientSolution } from "@/lib/types";
import type { SolutionMetaMap } from "@/lib/catalog-filters";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * One overlapping record, with the action that record makes possible: contact
 * its owner and take the file for a built solution, or reach the person who
 * already asked for an unbuilt idea. A match with no way to act on it would
 * leave the reader exactly where they started.
 */
function MatchCard({
  match,
  solutionMeta,
  onOpen,
}: {
  match: OverlapMatch;
  solutionMeta: SolutionMetaMap;
  onOpen: (id: string) => void;
}) {
  const rec = match.record;

  if (rec.doc_type === "solution") {
    const sol = rec as ClientSolution;
    const meta = solutionMeta[sol.id];
    return (
      <article className="overlap-card">
        <div className="overlap-head">
          <span className="chip">{sol.artifact_type}</span>
          <span className="overlap-rel">
            {match.relation === "built" ? "Already built" : "Related build"}
          </span>
        </div>
        <h3>{sol.name}</h3>
        <p className="overlap-summary">
          {sol.ai_generated_summary ?? sol.raw_description}
        </p>
        <p className="overlap-meta">
          {sol.solution_owner_email ? (
            <a className="contact-link" href={mailtoFor(sol.solution_owner_email, sol.name)}>
              {sol.solution_owner_name}
            </a>
          ) : (
            sol.solution_owner_name
          )}
          {meta ? ` · ${meta.org}` : ""}
          {sol.date_built ? ` · built ${fmtDate(sol.date_built)}` : ""}
        </p>
        <div className="overlap-actions">
          <a className="btn-primary" href={artifactHref(sol.id)} download>
            Download the artifact
          </a>
          <button type="button" className="btn-secondary" onClick={() => onOpen(sol.id)}>
            See the record
          </button>
        </div>
      </article>
    );
  }

  const idea = rec as ClientIdea;
  return (
    <article className="overlap-card">
      <div className="overlap-head">
        <span className={`status-chip s-${idea.status}`}>
          {idea.status === "in_progress" ? "in progress" : idea.status}
        </span>
        <span className="overlap-rel">
          {match.relation === "asked" ? "Already asked for" : "Related request"}
        </span>
      </div>
      <h3>{idea.title}</h3>
      <p className="overlap-summary">{idea.description}</p>
      <p className="overlap-meta">
        {idea.submitted_by_email ? (
          <a className="contact-link" href={mailtoFor(idea.submitted_by_email, idea.title)}>
            {idea.submitted_by_name}
          </a>
        ) : (
          idea.submitted_by_name
        )}
        {` · ${idea.org}`}
        {idea.submitted_date ? ` · asked ${fmtDate(idea.submitted_date)}` : ""}
      </p>
      <div className="overlap-actions">
        {idea.submitted_by_email && (
          <a className="btn-secondary" href={mailtoFor(idea.submitted_by_email, idea.title)}>
            Reach whoever asked
          </a>
        )}
        <button type="button" className="btn-secondary" onClick={() => onOpen(idea.id)}>
          See the record
        </button>
      </div>
    </article>
  );
}

/**
 * The verdict layer of the answer: what to do, why, and the records that make
 * the case. The board below is the second layer — everything else in the same
 * space, re-ranked against the same description.
 */
export default function VerdictBlock({
  result,
  explanation,
  solutionMeta,
  onOpen,
}: {
  result: OverlapResult;
  explanation: string | null;
  solutionMeta: SolutionMetaMap;
  onOpen: (id: string) => void;
}) {
  const copy = VERDICT_COPY[result.verdict];
  const matches = [...result.solutions, ...result.ideas];

  return (
    <>
      <section className={`verdict v-${result.verdict}`} aria-live="polite">
        {/*
          No score explainer here, deliberately. The verdict shows no match
          labels — it states a judgement in words — so the explainer belongs
          where the labels actually appear, on the board's control row. One
          explainer, next to the thing it explains.
        */}
        <h2>{copy.headline}</h2>
        <p className="verdict-action">{copy.action}</p>
        {explanation && <p className="verdict-explain">{explanation}</p>}
      </section>

      {matches.length > 0 && (
        <div className="overlap-list">
          {matches.map((m) => (
            <MatchCard
              key={m.record.id}
              match={m}
              solutionMeta={solutionMeta}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </>
  );
}

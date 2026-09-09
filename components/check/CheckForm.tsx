"use client";

import { useState } from "react";
import { mailtoFor } from "@/lib/contact";
import { artifactHref } from "@/lib/artifact-file";
import { VERDICT_COPY, type CheckApiResponse, type OverlapMatch } from "@/lib/overlap";
import type { ClientIdea, ClientSolution } from "@/lib/types";
import type { SolutionMetaMap } from "@/lib/catalog-filters";

const MAX_CHARS = 1200;

const EXAMPLES = [
  "A tool that reads the AP shared inbox every morning and sorts the mail so the team can clear the day from one list.",
  "Something that reminds us to re-check vendor risk assessments before they expire.",
  "A way to turn meeting notes into a list of who owes what by when.",
];

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
}: {
  match: OverlapMatch;
  solutionMeta: SolutionMetaMap;
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
          {sol.solution_owner_email && (
            <a className="btn-secondary" href={mailtoFor(sol.solution_owner_email, sol.name)}>
              Contact owner
            </a>
          )}
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
        <a className="btn-secondary" href={`/?record=${encodeURIComponent(idea.id)}`}>
          See it on the board
        </a>
      </div>
    </article>
  );
}

export default function CheckForm({ solutionMeta }: { solutionMeta: SolutionMetaMap }) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<CheckApiResponse | null>(null);

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    const text = description.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text }),
      });
      const json = (await res.json()) as CheckApiResponse;
      if (!res.ok || json.error) {
        setError(json.error ?? `Check failed (${res.status}).`);
      } else {
        setResponse(json);
      }
    } catch {
      setError("The check request failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const result = response?.result;
  const copy = result ? VERDICT_COPY[result.verdict] : null;
  const matches = result ? [...result.solutions, ...result.ideas] : [];

  return (
    <div>
      <form className="check-panel" onSubmit={run}>
        <label className="check-label" htmlFor="check-input">
          What are you planning to build?
        </label>
        <textarea
          id="check-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe it the way you would to a colleague: the problem, who it is for, and what it would do."
          rows={5}
          maxLength={MAX_CHARS}
        />
        <div className="check-foot">
          <span className="check-count">
            {description.length} / {MAX_CHARS}
          </span>
          <button type="submit" disabled={loading || !description.trim()}>
            {loading ? "Checking" : "Check the catalog"}
          </button>
        </div>

        {!response && !loading && (
          <div className="check-examples">
            <span>Try one:</span>
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                type="button"
                className="xlink-chip"
                onClick={() => setDescription(ex)}
              >
                {ex.split(" ").slice(0, 5).join(" ")}…
              </button>
            ))}
          </div>
        )}
      </form>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {result && copy && (
        <section className={`verdict v-${result.verdict}`} aria-live="polite">
          <h2>{copy.headline}</h2>
          <p className="verdict-action">{copy.action}</p>
          {response?.explanation && (
            <p className="verdict-explain">{response.explanation}</p>
          )}
        </section>
      )}

      {matches.length > 0 && (
        <div className="overlap-list">
          {matches.map((m) => (
            <MatchCard key={m.record.id} match={m} solutionMeta={solutionMeta} />
          ))}
        </div>
      )}

      {result?.verdict === "clear" && (
        <p className="check-clear-note">
          Nothing scored close enough to be worth your time reading. That is a
          real answer, not an empty result: the catalog holds every idea and
          built solution across all five services.
        </p>
      )}
    </div>
  );
}

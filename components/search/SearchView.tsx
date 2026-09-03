"use client";

import { useMemo, useState } from "react";
import type { SearchApiResponse } from "@/lib/types";
import { hasAnyRealMatch, topScoreOf } from "@/lib/match-label";
import SynthesizedAnswer from "./SynthesizedAnswer";
import ResultsPanels from "./ResultsPanels";

export default function SearchView({ variant }: { variant: "pre" | "post" }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Whole-result-set gate: if even the best score is noise (e.g. a query
  // like "cooking" against this catalog), show nothing rather than a pile of
  // technically-top-8 but meaningless cards. See lib/match-label.ts.
  const hasResults = useMemo(() => {
    if (!results) return false;
    const topScore = topScoreOf([...results.ideas, ...results.solutions].map((r) => r.score));
    return hasAnyRealMatch(topScore);
  }, [results]);
  const shownIdeas = useMemo(() => (results && hasResults ? results.ideas : []), [results, hasResults]);
  const shownSolutions = useMemo(
    () => (results && hasResults ? results.solutions : []),
    [results, hasResults]
  );

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setSelectedId(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const json = (await res.json()) as SearchApiResponse;
      if (!res.ok || json.error) {
        setError(json.error ?? `Search failed (${res.status}).`);
        setResults(null);
      } else {
        setResults(json);
      }
    } catch {
      setError("Search request failed. Check your connection and try again.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form className="search-bar" onSubmit={runSearch} role="search">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. has anything been built to handle invoice disputes?"
          aria-label="Search the idea catalog"
        />
        <button type="submit" disabled={loading || !query.trim()}>
          {loading ? "Searching" : "Search"}
        </button>
      </form>
      <p className="search-note">
        Matches are ranked by how closely the meaning of your question matches
        each record — not by keyword overlap.
      </p>
      <p className="search-status" aria-live="polite">
        {loading
          ? "Embedding the question and comparing it against the catalog..."
          : results
            ? hasResults
              ? `${shownIdeas.length} idea${shownIdeas.length === 1 ? "" : "s"} and ${shownSolutions.length} solution${shownSolutions.length === 1 ? "" : "s"} shown.`
              : "Nothing in the catalog matches closely enough to show."
            : ""}
      </p>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {results && !error && (
        <>
          {results.answer && <SynthesizedAnswer answer={results.answer} />}
          <ResultsPanels
            ideas={shownIdeas}
            solutions={shownSolutions}
            selectedId={selectedId}
            onSelect={setSelectedId}
            variant={variant}
          />
        </>
      )}

      {!results && !error && !loading && (
        <div className="empty-state" style={{ marginTop: 28 }}>
          <p>Nothing searched yet.</p>
          <p>
            Try asking the way you would ask a colleague — for example{" "}
            <em>&ldquo;has this already been solved?&rdquo;</em> questions about
            invoice disputes, onboarding paperwork, or meeting follow-ups.
          </p>
        </div>
      )}
    </div>
  );
}

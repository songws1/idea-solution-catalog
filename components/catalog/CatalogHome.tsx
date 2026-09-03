"use client";

import { useMemo, useState } from "react";
import type { ClientRecord, ClientScoredResult, DatasetVariant, SearchApiResponse } from "@/lib/types";
import { hasAnyRealMatch, topScoreOf } from "@/lib/match-label";
import type { DetailRecord } from "@/components/record/RecordDetail";
import RecordDetailDrawer from "@/components/record/RecordDetailDrawer";
import FilterBar from "./FilterBar";
import CatalogGrid from "./CatalogGrid";
import {
  EMPTY_FILTERS,
  applyFilters,
  describeFilters,
  deriveFilterOptions,
  isFilterActive,
  toggleValue,
  type FilterState,
  type SolutionMetaMap,
} from "@/lib/catalog-filters";
import type { ClientDataset } from "@/lib/client-records";
import SynthesizedAnswer from "@/components/search/SynthesizedAnswer";
import KanbanResults from "@/components/search/KanbanResults";

/**
 * Client shell for the catalog landing page (Addendum A §1 + §2).
 *
 * Search bar stays visually dominant at the top; everything else is a
 * secondary way in (§1 principle). Two modes over one dataset:
 *  - browse (no query): unified filter bar + card grid, all client-side;
 *  - results (query submitted): ranked results in the Kanban view, whole set
 *    gated by hasAnyRealMatch() exactly as SearchView gated it before.
 */
export default function CatalogHome({
  variant,
  catalog,
  solutionMeta,
}: {
  variant: DatasetVariant;
  catalog: ClientDataset;
  solutionMeta: Record<string, { org: string; service: string }>;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [detail, setDetail] = useState<DetailRecord | null>(null);
  void variant;

  // Whole-result-set noise gate — lib/match-label.ts, reused not reimplemented.
  const hasResults = useMemo(() => {
    if (!results) return false;
    const top = topScoreOf([...results.ideas, ...results.solutions].map((r) => r.score));
    return hasAnyRealMatch(top);
  }, [results]);
  const shownIdeas = useMemo(
    () => (results && hasResults ? results.ideas : []),
    [results, hasResults]
  );
  const shownSolutions = useMemo(
    () => (results && hasResults ? results.solutions : []),
    [results, hasResults]
  );

  const filterOptions = useMemo(
    () => deriveFilterOptions(catalog, solutionMeta),
    [catalog, solutionMeta]
  );
  const filtered = useMemo(
    () => applyFilters(catalog, solutionMeta, filters),
    [catalog, solutionMeta, filters]
  );

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setDetail(null);
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

  function clearSearch() {
    setResults(null);
    setQuery("");
    setError(null);
  }

  /** §1.4: a tag pill click filters the grid to that tag and scrolls to top. */
  function handleTagClick(tag: string) {
    setFilters((f) => ({ ...f, tags: toggleValue(f.tags, tag) }));
    clearSearch();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Open a record's detail. Scored context attached when it came from results. */
  function openDetail(item: ClientScoredResult, top: number) {
    setDetail({ record: item.record, score: item.score, topScore: top, viaLink: item.via_link });
  }

  /** Browse-grid click: same detail, no match label (no query to be relative to). */
  function openBrowseDetail(record: ClientRecord) {
    setDetail({ record });
  }

  /**
   * §2.4 navigation contract: jump to (scroll + highlight) the record's card
   * wherever it is in the current view; open its detail directly when no card
   * is rendered for it. Never a dead click.
   */
  function navigateToRecord(id: string) {
    const el = document.querySelector<HTMLElement>(`[data-record-id="${id}"]`);
    if (el) {
      setDetail(null); // reveal the card the drawer was covering
      window.setTimeout(() => {
        el.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "center",
        });
        el.classList.add("jump-flash");
        window.setTimeout(() => el.classList.remove("jump-flash"), 1800);
      }, 60);
      return;
    }
    // Not rendered as a card — open its detail directly.
    if (results && hasResults) {
      const top = topScoreOf([...results.ideas, ...results.solutions].map((r) => r.score));
      const hit = [...results.ideas, ...results.solutions].find((r) => r.record.id === id);
      if (hit) {
        setDetail({ record: hit.record, score: hit.score, topScore: top, viaLink: hit.via_link });
        return;
      }
    }
    const fromCatalog =
      catalog.ideas.find((i) => i.id === id) ?? catalog.solutions.find((s) => s.id === id);
    if (fromCatalog) setDetail({ record: fromCatalog });
  }

  const resultsTopScore = hasResults
    ? topScoreOf([...shownIdeas, ...shownSolutions].map((r) => r.score))
    : 0;

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
        each record — not by keyword overlap. Or browse the catalog below.
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
        <div className="results-area">
          {results.answer && <SynthesizedAnswer answer={results.answer} />}
          {hasResults ? (
            <>
              <KanbanResults
                ideas={shownIdeas}
                solutions={shownSolutions}
                onOpen={(item) => openDetail(item, resultsTopScore)}
              />
              <button type="button" className="clear-search" onClick={clearSearch}>
                Clear this search and browse the catalog
              </button>
            </>
          ) : (
            <div className="empty-state" style={{ marginTop: 28 }}>
              <p>Nothing in the catalog matches that phrasing.</p>
              <p>
                Try different words — the search works on meaning, so describe
                the problem the way the team that built a solution might
                describe it. Or{" "}
                <button type="button" className="link-button" onClick={clearSearch}>
                  browse the catalog
                </button>{" "}
                instead.
              </p>
            </div>
          )}
        </div>
      )}

      {!results && (
        <>
          <FilterBar
            options={filterOptions}
            filters={filters}
            onToggle={(facet, value) =>
              setFilters((f) => ({ ...f, [facet]: toggleValue(f[facet], value) }))
            }
            onClearAll={() => setFilters(EMPTY_FILTERS)}
          />
          <CatalogGrid
            solutions={filtered.solutions}
            meta={solutionMeta}
            openIdeas={filtered.openIdeas}
            onOpen={openBrowseDetail}
            onTagClick={handleTagClick}
            activeFilterDescriptions={isFilterActive(filters) ? describeFilters(filters) : []}
            onClearFilters={() => setFilters(EMPTY_FILTERS)}
          />
        </>
      )}

      <RecordDetailDrawer
        detail={detail}
        onClose={() => setDetail(null)}
        onNavigate={navigateToRecord}
        onTagClick={handleTagClick}
        solutionMeta={solutionMeta}
      />
    </div>
  );
}

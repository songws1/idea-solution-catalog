"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  BoardItem,
  ClientIdea,
  ClientSolution,
  DatasetVariant,
  SearchApiResponse,
} from "@/lib/types";
import { hasAnyRealMatch, topScoreOf } from "@/lib/match-label";
import type { DetailRecord } from "@/components/record/RecordDetail";
import RecordDetailDrawer from "@/components/record/RecordDetailDrawer";
import FilterBar from "./FilterBar";
import {
  EMPTY_FILTERS,
  applyFilters,
  describeFilters,
  deriveFilterOptions,
  filterScored,
  isFilterActive,
  toggleValue,
  type FilterState,
  type SolutionMetaMap,
} from "@/lib/catalog-filters";
import type { ClientDataset } from "@/lib/client-records";
import SynthesizedAnswer from "@/components/search/SynthesizedAnswer";
import KanbanResults from "@/components/search/KanbanResults";
import MatchHelp from "@/components/search/MatchHelp";
import { DEFAULT_SORT, SORT_LABELS, sortBoardItems, type SortKey } from "@/lib/board-sort";

/**
 * Client shell for the catalog page (v3 §0/§3.1). The Kanban board is the
 * ONLY layout: `/` renders it over the full dataset unfiltered, and a search
 * filters and ranks that same board, adds the synthesised answer above it and
 * a match label to each card — no component swap, no grid/board toggle.
 *
 * The search panel is one white surface holding the input, the filter chips
 * and (after a search) the synthesised answer. Chips narrow the board in both
 * modes with the same facet logic (browse: applyFilters; search: filterScored).
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
  const [pendingJump, setPendingJump] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  void variant;

  // Whole-result-set noise gate — lib/match-label.ts, reused not reimplemented.
  const hasResults = useMemo(() => {
    if (!results) return false;
    const top = topScoreOf([...results.ideas, ...results.solutions].map((r) => r.score));
    return hasAnyRealMatch(top);
  }, [results]);

  const filterOptions = useMemo(
    () => deriveFilterOptions(catalog, solutionMeta),
    [catalog, solutionMeta]
  );
  const filtered = useMemo(
    () => applyFilters(catalog, solutionMeta, filters),
    [catalog, solutionMeta, filters]
  );

  // Search mode: the chips narrow the ranked results with the same facet
  // logic (v3 §0/§3.1). Labels stay relative to the UNfiltered result set's
  // top score — narrowing must not re-grade the scale.
  const searchView = useMemo(() => {
    if (!results || !hasResults) return null;
    return filterScored(results.ideas, results.solutions, solutionMeta, filters);
  }, [results, hasResults, solutionMeta, filters]);

  // Browse mode: the full dataset (minus active filters), unscored. The
  // clustering pool is ALL ideas (v3 §3.2 — solved ideas feed the Resolves
  // line on solution cards even though they never get their own column card);
  // column membership still comes from filtered.ideas alone.
  const browseView = useMemo(
    () => ({
      ideas: sortBoardItems(
        filtered.ideas.map((r): BoardItem => ({ record: r })),
        sort
      ),
      solutions: sortBoardItems(
        filtered.solutions.map((r): BoardItem => ({ record: r })),
        sort
      ),
      clusterPool: catalog.ideas.map((r): BoardItem => ({ record: r })),
    }),
    [filtered, catalog, sort]
  );

  const resultsTopScore =
    results && hasResults
      ? topScoreOf([...results.ideas, ...results.solutions].map((r) => r.score))
      : undefined;

  // Linked-record identity for the detail view's inline info line (Phase 4.1 #2),
  // and the id → title map backing the title-not-id rule (v3 §2.1).
  const ideasById = useMemo(
    () => Object.fromEntries(catalog.ideas.map((i) => [i.id, i])) as Record<string, ClientIdea>,
    [catalog]
  );
  const solutionsById = useMemo(
    () =>
      Object.fromEntries(catalog.solutions.map((s) => [s.id, s])) as Record<string, ClientSolution>,
    [catalog]
  );
  const titleOf = (id: string) => ideasById[id]?.title ?? solutionsById[id]?.name;

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

  /** §1.4: a tag pill click filters the board to that tag and scrolls to top. */
  function handleTagClick(tag: string) {
    setFilters((f) => ({ ...f, tags: toggleValue(f.tags, tag) }));
    clearSearch();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Footer facet click (§2.2 third case): narrow the current view, keep the search. */
  function handleFacetClick(facet: "orgs" | "services", value: string) {
    setFilters((f) => ({ ...f, [facet]: toggleValue(f[facet], value) }));
  }

  /** Open a record's detail. Scored context attached only in search mode. */
  function openDetail(item: BoardItem) {
    setDetail({
      record: item.record,
      score: item.score,
      topScore: item.score !== undefined ? resultsTopScore : undefined,
      viaLink: item.via_link,
    });
  }

  /**
   * Scroll a rendered card tile into view and briefly highlight it (§2.4).
   * Shared by both navigation contracts below.
   */
  function flashTile(el: HTMLElement) {
    el.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
    });
    el.classList.add("jump-flash");
    window.setTimeout(() => el.classList.remove("jump-flash"), 1800);
  }

  /** Open a record's detail by id — scored context when it's in the current results. */
  function openDetailById(id: string) {
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

  /**
   * §2.4 navigation contract: jump to (scroll + highlight) the record's card
   * wherever it is in the current view; open its detail directly when no card
   * is rendered for it. Never a dead click.
   */
  function navigateToRecord(id: string) {
    const el = document.querySelector<HTMLElement>(`[data-record-id="${id}"]`);
    if (el) {
      setDetail(null); // reveal the card the drawer was covering
      window.setTimeout(() => flashTile(el), 60);
      return;
    }
    // Not rendered as a card — open its detail directly.
    openDetailById(id);
  }

  /**
   * Duplicate-candidate navigation (Phase 4.1 fix #1): always land on the
   * record's tile on the board — scroll + highlight, never a drawer unless
   * no tile can exist (solved/linked ideas render no tile in any view).
   * Fallback chain: current-view tile → cleared-to-browse board tile (clears
   * search and filters) → candidate's detail as a last resort.
   */
  function jumpToDuplicate(id: string) {
    setDetail(null);
    const el = document.querySelector<HTMLElement>(`[data-record-id="${id}"]`);
    if (el) {
      window.setTimeout(() => flashTile(el), 60);
      return;
    }
    setResults(null);
    setError(null);
    setQuery("");
    setFilters(EMPTY_FILTERS);
    setPendingJump(id);
  }

  // Resume a duplicate-candidate jump after the clear-to-browse re-render:
  // flash the tile when it exists, else open the candidate's detail (last
  // resort — candidates not on the browse board are solved/linked ideas).
  useEffect(() => {
    if (!pendingJump) return;
    const id = pendingJump;
    setPendingJump(null);
    const el = document.querySelector<HTMLElement>(`[data-record-id="${id}"]`);
    if (el) {
      flashTile(el);
      return;
    }
    openDetailById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingJump]);

  /**
   * Cross-navigation from Governance (v3 §4.7). That tab used to dead-end: a
   * reviewer who spotted a problem had no way to reach it. Two entry params:
   *
   *   /?service=<name>  pre-filter the board to one service
   *   /?record=<id>     land on that record's tile, or its drawer if it has none
   *
   * The param is stripped from the URL once consumed, so a refresh or a shared
   * link doesn't silently re-apply a filter the person didn't choose. Runs once
   * on mount — this is an entry point, not a synced route state.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const service = params.get("service");
    const record = params.get("record");
    if (!service && !record) return;

    if (service) setFilters((f) => ({ ...f, orgs: [service] }));
    if (record) setPendingJump(record);

    window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filterDescriptions = isFilterActive(filters) ? describeFilters(filters) : [];
  // Board data for the active mode: search results (chip-narrowed) or browse.
  const board =
    results && hasResults && searchView
      ? { ideas: searchView.ideas, solutions: searchView.solutions, clusterPool: undefined }
      : browseView;
  // Every column empty under active filters — same treatment in both modes.
  const filteredEmpty =
    isFilterActive(filters) && board.ideas.length === 0 && board.solutions.length === 0;

  return (
    <div>
      {/*
        v4.5: the check panel above this is now the page's primary act, so the
        search panel steps down a level. It keeps everything it did — semantic
        search, chips, the synthesised answer — but reads as "the other way in"
        rather than the thing you came for. Two full-weight text inputs on one
        page would just make a reader guess which one they are supposed to use.
      */}
      <div className="board-section">
        <h2 className="board-section-head">Or browse what already exists</h2>
        <p className="board-section-sub">
          Ask in your own words, or filter the board. Search ranks by meaning,
          so describe the problem the way the team that solved it would.
        </p>
      </div>

      <div className="search-panel search-panel-secondary">
        <form className="search-bar" onSubmit={runSearch} role="search">
          {/* maxLength mirrors MAX_QUERY_CHARS in app/api/search/route.ts. The
              route is the enforcement; this is only the input-level hint. */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. has anything been built to handle invoice disputes?"
            aria-label="Search the idea catalog"
            maxLength={300}
          />
          <button type="submit" disabled={loading || !query.trim()}>
            {loading ? "Searching" : "Search"}
          </button>
        </form>
        <p className="search-status" aria-live="polite">
          {loading
            ? "Embedding the question and comparing it against the catalog..."
            : results
              ? hasResults
                ? `${searchView?.ideas.length ?? 0} idea${(searchView?.ideas.length ?? 0) === 1 ? "" : "s"} and ${searchView?.solutions.length ?? 0} solution${(searchView?.solutions.length ?? 0) === 1 ? "" : "s"} shown.`
                : "Nothing in the catalog matches closely enough to show."
              : ""}
        </p>

        <FilterBar
          options={filterOptions}
          filters={filters}
          onToggle={(facet, value) =>
            setFilters((f) => ({ ...f, [facet]: toggleValue(f[facet], value) }))
          }
          onClearAll={() => setFilters(EMPTY_FILTERS)}
        />

        {/*
          Board order, stated rather than implied. In search mode the order IS
          the answer — the board is ranked by match — so the control is replaced
          by a line saying so instead of silently doing nothing.
        */}
        <div className="board-order">
          {results && hasResults ? (
            <span className="board-order-note">
              Ranked by how well each record matches your question.
            </span>
          ) : (
            <label className="board-order-control">
              <span>Order</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <option key={key} value={key}>
                    {SORT_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
          )}
          {results && hasResults && <MatchHelp />}
        </div>

        {results && !error && results.answer && (
          <SynthesizedAnswer answer={results.answer} />
        )}
      </div>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {results && !error && !hasResults ? (
        // §3.7: preserved from Phase 1 — no filler cards when nothing really matches.
        <div className="empty-state" style={{ marginTop: 28 }}>
          <p>Nothing in the catalog matches that phrasing.</p>
          <p>
            Try different words — the search works on meaning, so describe
            the problem the way the team that built a solution might
            describe it. Or{" "}
            <button type="button" className="link-button" onClick={clearSearch}>
              browse the board
            </button>{" "}
            instead.
          </p>
        </div>
      ) : filteredEmpty ? (
        <div className="empty-state" style={{ marginTop: 24 }}>
          <p>No records match the current filters.</p>
          {filterDescriptions.length > 0 && (
            <ul className="active-filter-list">
              {filterDescriptions.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
          <p>
            <button
              type="button"
              className="filter-clear"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              Clear all filters
            </button>
          </p>
        </div>
      ) : (
        !error && (
          <div className="results-area">
            <KanbanResults
              ideas={board.ideas}
              solutions={board.solutions}
              clusterPool={board.clusterPool}
              onOpen={openDetail}
              onJumpToDuplicate={jumpToDuplicate}
              onNavigate={navigateToRecord}
              solutionMeta={solutionMeta}
              onFacetClick={handleFacetClick}
              titleOf={titleOf}
            />
            {results && (
              <button type="button" className="clear-search" onClick={clearSearch}>
                Clear this search and browse the catalog
              </button>
            )}
          </div>
        )
      )}

      <RecordDetailDrawer
        detail={detail}
        onClose={() => setDetail(null)}
        onNavigate={navigateToRecord}
        onJumpToDuplicate={jumpToDuplicate}
        onTagClick={handleTagClick}
        solutionMeta={solutionMeta}
        ideasById={ideasById}
        solutionsById={solutionsById}
      />
    </div>
  );
}

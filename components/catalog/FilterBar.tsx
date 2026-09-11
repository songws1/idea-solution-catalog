"use client";

import { useEffect, useRef, useState } from "react";
import {
  SOLUTION_ONLY_FACETS,
  type FacetCounts,
  type FilterOptions,
  type FilterState,
} from "@/lib/catalog-filters";

/**
 * Unified two-tier browse-by filter bar (Addendum A §1.1.2) — NOT a separate
 * intent-chip row. Primary chips always visible; "More filters" expands a
 * secondary row. The top-level facet (stored `org`, labelled "Service")
 * intentionally appears in both tiers (same selection state, §1.1).
 * Multi-select dropdown chips, not modals. Entirely client-side: selecting
 * filters narrows the grid live, no LLM call.
 */

interface FacetDef {
  /** Unique id for open/close tracking (a facet may appear in both tiers). */
  id: string;
  key: keyof FilterState;
  label: string;
  options: string[];
}

interface Props {
  options: FilterOptions;
  filters: FilterState;
  /**
   * How many records each value would give you, counted against the board's
   * current pool with this facet's own selection removed (v4.12). See
   * facetCounts in lib/catalog-filters.ts.
   */
  counts: FacetCounts;
  onToggle: (facet: keyof FilterState, value: string) => void;
  onClearAll: () => void;
}

interface ChipProps {
  def: FacetDef;
  selected: string[];
  counts: Record<string, number>;
  onToggle: Props["onToggle"];
  openId: string | null;
  setOpenId: (id: string | null) => void;
}

function FacetChip({ def, selected, counts, onToggle, openId, setOpenId }: ChipProps) {
  const isOpen = openId === def.id;
  const count = selected.length;

  /**
   * Values are ordered by how much they hold, not alphabetically (v4.12).
   * A facet menu is the one place the catalog's own shape can be read, and
   * "HR Shared Services 31 / Finance Operations 24 / …" says it in the order
   * the eye already wants. Empty values sink to the bottom on their own.
   */
  const ordered = [...def.options].sort(
    (a, b) => (counts[b] ?? 0) - (counts[a] ?? 0) || a.localeCompare(b)
  );

  return (
    <div className="filter-chip">
      <button
        type="button"
        className={"filter-chip-btn" + (count > 0 ? " has-selection" : "")}
        onClick={() => setOpenId(isOpen ? null : def.id)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {def.label}
        {count > 0 && <span className="filter-count">{count}</span>}
      </button>
      {isOpen && (
        <div className="filter-menu" role="group" aria-label={`Filter by ${def.label}`}>
          {SOLUTION_ONLY_FACETS.has(def.key) && (
            /* Behaviour that existed all along and only became visible once
               there were numbers to explain: these two facets describe a built
               solution, so they narrow the Solution column and leave every
               idea on the board. Saying it here is cheaper than a reader
               discovering it by clicking and counting. */
            <p className="filter-menu-note">
              Counts are built solutions. Ideas are not filtered by this.
            </p>
          )}
          {ordered.map((opt) => {
            const n = counts[opt] ?? 0;
            const checked = selected.includes(opt);
            /**
             * A zero value is a dead end, so it is shown greyed and inert
             * rather than hidden: hiding it makes the menu's contents change
             * as other filters move, which reads as the app losing options.
             * An already-checked value stays clickable whatever its count,
             * because the reader has to be able to undo it.
             */
            const dead = n === 0 && !checked;
            return (
              <label
                key={opt}
                className={"filter-option" + (dead ? " is-empty" : "")}
                title={dead ? "No records in the current view" : undefined}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={dead}
                  onChange={() => onToggle(def.key, opt)}
                />
                <span className="filter-option-label">{opt}</span>
                <span className="filter-option-count">{n}</span>
              </label>
            );
          })}
          {def.options.length === 0 && (
            <p className="filter-menu-empty">No values in the current dataset.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function FilterBar({ options, filters, counts, onToggle, onClearAll }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close any open dropdown when clicking outside the whole bar.
  useEffect(() => {
    if (!openId) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenId(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openId]);

  // v3 §1 mapping: stored `org` renders as "Service"; stored `service` as
  // "Sub-service". Keys stay the stored field names — filtering logic is
  // untouched by the relabel.
  const primary: FacetDef[] = [
    { id: "orgs-primary", key: "orgs", label: "Service", options: options.orgs },
    { id: "services", key: "services", label: "Sub-service", options: options.services },
    { id: "artifactTypes", key: "artifactTypes", label: "Solution type", options: options.artifactTypes },
    { id: "technologyTypes", key: "technologyTypes", label: "Technology type", options: options.technologyTypes },
  ];
  const secondary: FacetDef[] = [
    { id: "years", key: "years", label: "Year", options: options.years },
    { id: "months", key: "months", label: "Month", options: options.months },
    { id: "tags", key: "tags", label: "Taxonomy", options: options.tags },
    { id: "orgs-secondary", key: "orgs", label: "Service", options: options.orgs },
  ];

  const anyActive =
    Object.values(filters).some((list) => list.length > 0);
  const secondaryActive =
    filters.years.length + filters.months.length + filters.tags.length + filters.orgs.length;

  const chip = (def: FacetDef) => (
    <FacetChip
      key={def.id}
      def={def}
      selected={filters[def.key]}
      counts={counts[def.key] ?? {}}
      onToggle={onToggle}
      openId={openId}
      setOpenId={setOpenId}
    />
  );

  return (
    <div className="filter-bar" ref={rootRef}>
      <div className="filter-row">
        {primary.map(chip)}
        <button
          type="button"
          className={"filter-more-btn" + (secondaryActive > 0 ? " has-selection" : "")}
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
        >
          More filters
          {secondaryActive > 0 && <span className="filter-count">{secondaryActive}</span>}
        </button>
        {anyActive && (
          <button type="button" className="filter-clear" onClick={onClearAll}>
            Clear all
          </button>
        )}
      </div>
      {moreOpen && <div className="filter-row filter-row-secondary">{secondary.map(chip)}</div>}
    </div>
  );
}
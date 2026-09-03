"use client";

import { useEffect, useRef, useState } from "react";
import type { FilterOptions, FilterState } from "@/lib/catalog-filters";

/**
 * Unified two-tier browse-by filter bar (Addendum A §1.1.2) — NOT a separate
 * intent-chip row. Primary chips always visible; "More filters" expands a
 * secondary row. Org intentionally appears in both tiers (same selection
 * state, §1.1). Multi-select dropdown chips, not modals. Entirely
 * client-side: selecting filters narrows the grid live, no LLM call.
 */

interface FacetDef {
  /** Unique id for open/close tracking (org appears twice under two labels). */
  id: string;
  key: keyof FilterState;
  label: string;
  options: string[];
}

interface Props {
  options: FilterOptions;
  filters: FilterState;
  onToggle: (facet: keyof FilterState, value: string) => void;
  onClearAll: () => void;
}

interface ChipProps {
  def: FacetDef;
  selected: string[];
  onToggle: Props["onToggle"];
  openId: string | null;
  setOpenId: (id: string | null) => void;
}

function FacetChip({ def, selected, onToggle, openId, setOpenId }: ChipProps) {
  const isOpen = openId === def.id;
  const count = selected.length;
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
          {def.options.map((opt) => (
            <label key={opt} className="filter-option">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => onToggle(def.key, opt)}
              />
              <span>{opt}</span>
            </label>
          ))}
          {def.options.length === 0 && (
            <p className="filter-menu-empty">No values in the current dataset.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function FilterBar({ options, filters, onToggle, onClearAll }: Props) {
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

  const primary: FacetDef[] = [
    { id: "services", key: "services", label: "Service", options: options.services },
    { id: "artifactTypes", key: "artifactTypes", label: "Solution type", options: options.artifactTypes },
    { id: "technologyTypes", key: "technologyTypes", label: "Technology type", options: options.technologyTypes },
    { id: "orgs-primary", key: "orgs", label: "Org", options: options.orgs },
  ];
  const secondary: FacetDef[] = [
    { id: "years", key: "years", label: "Year", options: options.years },
    { id: "months", key: "months", label: "Month", options: options.months },
    { id: "tags", key: "tags", label: "Taxonomy", options: options.tags },
    { id: "orgs-secondary", key: "orgs", label: "Org", options: options.orgs },
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
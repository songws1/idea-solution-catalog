"use client";

import { useEffect } from "react";
import RecordDetail, { type DetailRecord } from "./RecordDetail";
import type { SolutionMetaMap } from "@/lib/catalog-filters";

/**
 * Slide-over wrapper for the shared §2.4 detail. Overlay click and Escape
 * close it; the shared RecordDetail body renders inside. Kept as its own
 * component so the governance dashboard (§4.4) and graph view (§2.6) can
 * reuse the exact same presentation later.
 */

interface Props {
  detail: DetailRecord | null;
  onClose: () => void;
  onNavigate: (id: string) => void;
  onTagClick: (tag: string) => void;
  solutionMeta?: SolutionMetaMap;
}

export default function RecordDetailDrawer({
  detail,
  onClose,
  onNavigate,
  onTagClick,
  solutionMeta,
}: Props) {
  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detail, onClose]);

  if (!detail) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Record details"
        onClick={(e) => e.stopPropagation()}
      >
        <RecordDetail
          detail={detail}
          onClose={onClose}
          onNavigate={onNavigate}
          onTagClick={onTagClick}
          solutionMeta={solutionMeta}
        />
      </aside>
    </div>
  );
}
"use client";

import { useEffect } from "react";
import RecordDetail, { type DetailRecord } from "./RecordDetail";
import type { SolutionMetaMap } from "@/lib/catalog-filters";
import type { ClientIdea, ClientSolution } from "@/lib/types";

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
  /** Duplicate-candidate contract: jump to the record's tile, drawer last resort. */
  onJumpToDuplicate: (id: string) => void;
  onTagClick: (tag: string) => void;
  solutionMeta?: SolutionMetaMap;
  /** Dataset lookups backing the inline linked-record info line (Phase 4.1 #2). */
  ideasById?: Record<string, ClientIdea>;
  solutionsById?: Record<string, ClientSolution>;
}

export default function RecordDetailDrawer({
  detail,
  onClose,
  onNavigate,
  onJumpToDuplicate,
  onTagClick,
  solutionMeta,
  ideasById,
  solutionsById,
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
          onJumpToDuplicate={onJumpToDuplicate}
          onTagClick={onTagClick}
          solutionMeta={solutionMeta}
          ideasById={ideasById}
          solutionsById={solutionsById}
        />
      </aside>
    </div>
  );
}
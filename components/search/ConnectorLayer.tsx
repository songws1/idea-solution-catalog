"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { PanelPair } from "./ResultsPanels";

interface Props {
  containerRef: RefObject<HTMLDivElement | null>;
  pair: PanelPair | null;
}

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Draws the thin accent connector between a linked idea card and its solution
 * card. This is the one deliberate interactive detail of the search view;
 * it is skipped when the panels stack (narrow viewports).
 */
export default function ConnectorLayer({ containerRef, pair }: Props) {
  const [line, setLine] = useState<Line | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      if (!pair || window.innerWidth <= 900) {
        setLine(null);
        return;
      }
      const ideaEl = container.querySelector<HTMLElement>(`[data-record-id="${pair.ideaId}"]`);
      const solEl = container.querySelector<HTMLElement>(`[data-record-id="${pair.solutionId}"]`);
      if (!ideaEl || !solEl) {
        setLine(null);
        return;
      }
      const cRect = container.getBoundingClientRect();
      const aRect = ideaEl.getBoundingClientRect();
      const bRect = solEl.getBoundingClientRect();
      setLine({
        x1: aRect.right - cRect.left + 3,
        y1: aRect.top - cRect.top + aRect.height / 2,
        x2: bRect.left - cRect.left - 3,
        y2: bRect.top - cRect.top + bRect.height / 2,
      });
    };

    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [containerRef, pair]);

  if (!line) return null;
  const length = Math.hypot(line.x2 - line.x1, line.y2 - line.y1);

  return (
    <svg className="connector-layer" aria-hidden="true">
      <line
        key={`${pair?.ideaId}-${pair?.solutionId}`}
        className="connector-line"
        x1={line.x1}
        y1={line.y1}
        x2={line.x2}
        y2={line.y2}
        style={
          {
            "--line-len": `${length}px`,
            strokeDasharray: `${length}px`,
          } as React.CSSProperties
        }
      />
    </svg>
  );
}

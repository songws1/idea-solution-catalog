"use client";

import { useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { matchLabel } from "@/lib/match-label";
import type { OverlapResult } from "@/lib/overlap";
import { SCALE_GEOMETRY as G, buildScale, xOf, type ScaleDot } from "@/lib/similarity-scale";
import type { ClientScoredResult } from "@/lib/types";

/**
 * The similarity scale in the verdict (v4.14).
 *
 * Draws what lib/similarity-scale.ts decides; nothing about meaning is decided
 * here. See that file for what is plotted and why, and scripts/check-scale.ts
 * for the promise the picture is held to.
 *
 * Interaction, and the one deliberate exception it makes:
 *
 *   A dot opens that record's detail drawer directly. Everywhere else a
 *   cross-link follows the §2.4 contract (jump to the card, drawer as the last
 *   resort), but the scale is part of the verdict, and the verdict's job is a
 *   fast answer; sending the reader two thousand pixels down the board to find
 *   a flashing card would turn an answer into a search. The drawer offers "Show
 *   it on the board" when the record has a card, which restores that path.
 *
 *   One tab stop, not sixteen: arrow keys move between dots by score (right is
 *   closer, left is further), Enter or Space opens the drawer.
 *
 *   The tooltip shows the label the record's card actually carries. Cards are
 *   graded relative to the top score, so a 0.52 can read "Related"; saying so
 *   here stops the tooltip and the board silently disagreeing.
 */

const KIND_TEXT: Record<ScaleDot["kind"], string> = {
  solution: "Solution",
  "idea-open": "Idea, not built yet",
  "idea-built": "Idea, already built",
};

export default function SimilarityScale({
  ideas,
  solutions,
  result,
  topScore,
  onOpen,
}: {
  ideas: ClientScoredResult[];
  solutions: ClientScoredResult[];
  result: OverlapResult;
  /** Top score of a ranked board, or undefined when nothing was ranked (clear). */
  topScore: number | undefined;
  onOpen: (id: string) => void;
}) {
  const scale = useMemo(() => buildScale({ ideas, solutions, result }), [ideas, solutions, result]);
  const summaryId = useId();
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const refs = useRef<Map<number, SVGGElement>>(new Map());

  if (scale.dots.length === 0) return null;

  const byRank = scale.dots; // buildScale returns them highest first
  const last = byRank.length - 1;
  const shown = hovered ?? (focused ? active : null);
  const tipDot = shown !== null ? byRank[shown] : null;
  const pos = (id: string) => byRank.find((d) => d.id === id);

  function move(to: number) {
    const next = Math.max(0, Math.min(last, to));
    setActive(next);
    refs.current.get(next)?.focus();
  }

  function onKey(e: KeyboardEvent<SVGGElement>, rank: number) {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        move(rank - 1);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        move(rank + 1);
        break;
      case "Home":
        move(0);
        break;
      case "End":
        move(last);
        break;
      case "Enter":
      case " ":
        onOpen(byRank[rank].id);
        break;
      default:
        return;
    }
    e.preventDefault();
  }

  function cardNote(d: ScaleDot): string {
    if (d.kind === "idea-built") return "Built: its solution is the record to use";
    if (topScore === undefined) return "Nothing was close enough to rank";
    const label = matchLabel(d.score, topScore);
    if (label === "Strong match" || label === "Related") return `${label} on its card`;
    return "Too loosely related to show on the board";
  }

  const arc = (() => {
    if (!scale.twicePair) return null;
    const a = pos(scale.twicePair[0]);
    const b = pos(scale.twicePair[1]);
    if (!a || !b) return null;
    const [lo, hi] = a.x <= b.x ? [a, b] : [b, a];
    const mid = (lo.x + hi.x) / 2;
    const above = a.kind === "solution";
    const text = above ? "built twice: near-duplicates" : "asked twice: near-duplicates";
    if (above) {
      const top = Math.min(lo.y - lo.r, hi.y - hi.r);
      const peak = top - 16;
      return {
        d: `M${lo.x} ${lo.y - lo.r - 2} Q${mid} ${peak - 6} ${hi.x} ${hi.y - hi.r - 2}`,
        tx: mid,
        ty: Math.max(G.zoneTop + 2, peak - 4),
        text,
      };
    }
    const bottom = Math.max(lo.y + lo.r, hi.y + hi.r);
    const trough = bottom + 16;
    return {
      d: `M${lo.x} ${lo.y + lo.r + 2} Q${mid} ${trough + 6} ${hi.x} ${hi.y + hi.r + 2}`,
      tx: mid,
      ty: Math.min(G.height - 3, trough + 12),
      text,
    };
  })();

  const nearest = scale.nearestId ? pos(scale.nearestId) : null;

  return (
    <div className="sim-scale">
      <div className="sim-scale-frame">
        <svg
          viewBox={`0 0 ${G.width} ${G.height}`}
          role="group"
          aria-label="How close each result is to your description"
          aria-describedby={summaryId}
        >
          {scale.zones.map((z) => (
            <g key={z.key}>
              <rect
                className={`sim-zone sim-zone-${z.key}`}
                x={xOf(z.from)}
                y={G.zoneTop}
                width={xOf(z.to) - xOf(z.from)}
                height={G.zoneBottom - G.zoneTop}
              />
              <text
                className={`sim-zone-label${z.key === scale.activeZone ? " is-active" : ""}`}
                x={xOf(z.from) + 4}
                y={G.labelRow}
              >
                {z.label}
                {z.from > 0 && <tspan className="sim-zone-value"> {z.from.toFixed(2)}</tspan>}
              </text>
            </g>
          ))}
          <text className="sim-zone-label" x={xOf(1)} y={G.labelRow} textAnchor="end">
            1.00
          </text>
          {scale.zones
            .filter((z) => z.key === scale.activeZone)
            .map((z) => (
              <rect
                key="active"
                className="sim-zone-active"
                x={xOf(z.from) + 1}
                y={G.zoneTop + 1}
                width={xOf(z.to) - xOf(z.from) - 2}
                height={G.zoneBottom - G.zoneTop - 2}
                rx={3}
              />
            ))}

          <line className="sim-axis" x1={xOf(0)} x2={xOf(1)} y1={G.axis} y2={G.axis} />

          {arc && (
            <g className="sim-arc" aria-hidden="true">
              <path d={arc.d} />
              <text x={arc.tx} y={arc.ty} textAnchor="middle">
                {arc.text}
              </text>
            </g>
          )}

          {/* Lowest score drawn first, so where dots still touch the closer one is on top. */}
          {[...byRank].reverse().map((d) => {
            const isActive = d.rank === active;
            const style = {
              "--sim-dx": `${xOf(0) - d.x}px`,
              "--sim-i": d.rank,
            } as CSSProperties;
            return (
              <g
                key={d.id}
                ref={(el) => {
                  if (el) refs.current.set(d.rank, el);
                  else refs.current.delete(d.rank);
                }}
                className={`sim-dot sim-dot-${d.kind}`}
                style={style}
                role="button"
                tabIndex={isActive ? 0 : -1}
                aria-label={`${d.name}. ${KIND_TEXT[d.kind]}, similarity ${d.score.toFixed(2)}. Opens details.`}
                onClick={() => {
                  setActive(d.rank);
                  onOpen(d.id);
                }}
                onKeyDown={(e) => onKey(e, d.rank)}
                onMouseEnter={() => setHovered(d.rank)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => {
                  setActive(d.rank);
                  setFocused(true);
                }}
                onBlur={() => setFocused(false)}
              >
                <circle className="sim-hit" cx={d.x} cy={d.y} r={11} />
                {focused && isActive && <circle className="sim-focus" cx={d.x} cy={d.y} r={d.r + 4} />}
                <circle className="sim-mark" cx={d.x} cy={d.y} r={d.r} />
              </g>
            );
          })}

          {nearest && (
            <text
              className="sim-nearest"
              x={nearest.x + nearest.r + 6}
              y={nearest.y + 4}
              aria-hidden="true"
            >
              nearest, not a match
            </text>
          )}
        </svg>

        {tipDot && (
          <div
            className={
              "sim-tip" +
              (tipDot.x < 130 ? " is-left" : tipDot.x > G.width - 130 ? " is-right" : "")
            }
            style={{
              left: `${(tipDot.x / G.width) * 100}%`,
              top: `${((tipDot.y - tipDot.r) / G.height) * 100}%`,
            }}
            aria-hidden="true"
          >
            <strong>{tipDot.name}</strong>
            <span>
              {KIND_TEXT[tipDot.kind]} · {tipDot.score.toFixed(2)}
            </span>
            <span>{cardNote(tipDot)}</span>
            <span className="sim-tip-hint">Click for details</span>
          </div>
        )}
      </div>

      <p id={summaryId} className="visually-hidden">
        {scale.summary}
      </p>
      <div className="sim-legend" aria-hidden="true">
        <span>
          <svg viewBox="0 0 12 12"><circle className="sim-legend-solution" cx="6" cy="6" r="5" /></svg>
          solution
        </span>
        <span>
          <svg viewBox="0 0 12 12"><circle className="sim-legend-open" cx="6" cy="6" r="4" /></svg>
          idea, not built yet
        </span>
        <span>
          <svg viewBox="0 0 12 12"><circle className="sim-legend-built" cx="6" cy="6" r="3.5" /></svg>
          idea, already built
        </span>
        <span className="sim-legend-note">outlined zone decided the verdict</span>
      </div>
    </div>
  );
}

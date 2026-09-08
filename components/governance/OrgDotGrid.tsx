import type { DotState, OrgDotGridRow } from "@/lib/governance";

const STATE_LABELS: Record<DotState, string> = {
  open: "open idea",
  in_progress: "in progress",
  solved: "solved",
  duplicate: "duplicate flagged",
  solution_linked: "linked solution",
  solution_orphan: "solution, no linked idea",
};

/** Repeat a compact key every N service rows so it never requires scrolling back up (§4.2). */
const LEGEND_REPEAT_EVERY = 6;

function Legend({ compact }: { compact?: boolean }) {
  return (
    <div className={`legend${compact ? " legend-inline" : " legend-top"}`}>
      {(Object.keys(STATE_LABELS) as DotState[]).map((state) => (
        <span className="legend-item" key={state}>
          <span className={`dot d-${state}`} /> {STATE_LABELS[state]}
        </span>
      ))}
    </div>
  );
}

/**
 * One dot per record (v3 §4.4).
 *
 * Each dot is an anchor rather than a styled span, which is what actually fixes
 * the accessibility problems: it is focusable and activatable by keyboard for
 * free, it works on touch where the old hover-only identity did not, and it
 * carries the same cross-navigation contract as the rest of this tab. Shape and
 * fill double-encode the state so color is never the only channel, and the
 * label names the record by title — never by id (§2.1).
 */
export default function OrgDotGrid({ rows }: { rows: OrgDotGridRow[] }) {
  return (
    <section className="widget wide" id="dot-grid">
      {/* v3 §1: heading uses the UI label — rows are stored `org` values rendered
          as service lines. */}
      <h2>Every record, by service</h2>
      <p className="widget-sub">
        One dot per record. Shape and color both carry state, so neither is
        load-bearing alone. Select a dot to open that record on the board.
        Duplicate flags override status so the scale of duplication stays
        visible at a glance.
      </p>
      {/* Legend sits above the dot rows so the key is read first — §4.2. */}
      <Legend />
      {rows.map((row, i) => (
        <div key={row.org}>
          <div className="dot-org">
            <p className="dot-org-label">
              <a href={`/?service=${encodeURIComponent(row.org)}`}>{row.org}</a>{" "}
              <span className="dot-org-count">{row.dots.length} records</span>
            </p>
            <div className="dot-row">
              {row.dots.map((dot) => (
                <a
                  key={dot.recordId}
                  className={`dot d-${dot.state}`}
                  href={`/?record=${encodeURIComponent(dot.recordId)}`}
                  aria-label={`${dot.title} — ${STATE_LABELS[dot.state]}`}
                  title={`${dot.title} — ${STATE_LABELS[dot.state]}`}
                />
              ))}
            </div>
          </div>
          {(i + 1) % LEGEND_REPEAT_EVERY === 0 && i < rows.length - 1 && <Legend compact />}
        </div>
      ))}
    </section>
  );
}

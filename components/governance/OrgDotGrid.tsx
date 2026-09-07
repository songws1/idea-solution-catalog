import type { DotState, OrgDotGridRow } from "@/lib/governance";

const STATE_LABELS: Record<DotState, string> = {
  open: "open idea",
  in_progress: "in progress",
  solved: "solved",
  duplicate: "duplicate flagged",
  solution_linked: "linked solution",
  solution_orphan: "solution, no linked idea",
};

/** Repeat a compact key every N org rows so it never requires scrolling back up (§4.2). */
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

export default function OrgDotGrid({ rows }: { rows: OrgDotGridRow[] }) {
  return (
    <section className="widget wide">
      {/* v3 §1: heading uses the UI label — rows are stored `org` values rendered
          as service lines. */}
      <h2>Every record, by service</h2>
      <p className="widget-sub">
        One dot per record. Color carries state; hover any dot for the record it
        stands for. Duplicate flags override status color so the scale of
        duplication is visible at a glance.
      </p>
      {/* Legend sits above the dot rows so the key is read first — §4.2. */}
      <Legend />
      {rows.map((row, i) => (
        <div key={row.org}>
          <div className="dot-org">
            <p className="dot-org-label">
              {row.org} — {row.dots.length} records
            </p>
            <div className="dot-row">
              {row.dots.map((dot) => (
                <span
                  key={dot.recordId}
                  className={`dot d-${dot.state}`}
                  role="img"
                  aria-label={`${dot.recordId} — ${dot.title} (${STATE_LABELS[dot.state]})`}
                  title={`${dot.recordId} — ${dot.title} (${STATE_LABELS[dot.state]})`}
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

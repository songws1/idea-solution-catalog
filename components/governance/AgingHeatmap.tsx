import type { AgingHeat, AgingHeatCell } from "@/lib/governance";

/**
 * Aging as a heatmap (v4.15).
 *
 * See lib/governance.ts agingHeat() for what the cells mean and why the rows
 * are ordered the way they are. This draws it: one grid, two column groups with
 * a gap between them, counts printed in every cell.
 *
 * The service name links to the board pre-filtered (§4.7 cross-navigation), the
 * same link "Demand against supply" uses. Cells are not links: there is no
 * "solutions in this service not reviewed for a year" view to send anyone to,
 * and a control that looks clickable and is not is worse than plain text.
 */
function Cell({ cell, org }: { cell: AgingHeatCell; org: string }) {
  return (
    <div
      className={`heat-cell heat-${cell.ramp}-${cell.step}`}
      title={`${cell.value} ${org}: ${cell.label}`}
    >
      {cell.value}
    </div>
  );
}

const IDEA_HEADS = ["Under 6 months", "6 to 12", "Over 12"];
const SOLUTION_HEADS = ["Under 6 months", "6 to 12", "Over 12", "Never reviewed"];

export default function AgingHeatmap({ heat }: { heat: AgingHeat }) {
  return (
    <section className="widget wide" id="aging">
      <h2>Aging</h2>
      <p className="widget-sub">
        Unsolved ideas by time since they were submitted, and built solutions by
        time since anyone last confirmed they work. The boundaries are the same
        ones that put a trust mark on a card, so a count here and the marked
        cards on the board are the same records. Services are ordered by how
        much of each row needs acting on, which is the shaded half.
      </p>

      <div className="heat-scroll">
        <div className="heat">
          <div className="heat-blank" />
          <div className="heat-group heat-group-ideas">Ideas still waiting</div>
          <div className="heat-gap" />
          <div className="heat-group heat-group-solutions">Solutions since last review</div>

          <div className="heat-corner">Service</div>
          {IDEA_HEADS.map((h, i) => (
            <div key={`i-${h}`} className={"heat-head" + (i === 2 ? " is-urgent" : "")}>
              {h}
            </div>
          ))}
          <div className="heat-head heat-head-total">All</div>
          <div className="heat-gap" />
          {SOLUTION_HEADS.map((h, i) => (
            <div key={`s-${h}`} className={"heat-head" + (i >= 2 ? " is-urgent" : "")}>
              {h}
            </div>
          ))}
          <div className="heat-head heat-head-total">All</div>

          {heat.rows.map((row) => (
            <div className="heat-row" key={row.org}>
              <div className="heat-org">
                <a href={`/?service=${encodeURIComponent(row.org)}`}>{row.org}</a>
              </div>
              {row.ideas.map((c) => (
                <Cell key={`i-${c.key}`} cell={c} org={row.org} />
              ))}
              <div className="heat-total">{row.ideaTotal}</div>
              <div className="heat-gap" />
              {row.solutions.map((c) => (
                <Cell key={`s-${c.key}`} cell={c} org={row.org} />
              ))}
              <div className="heat-total">{row.solutionTotal}</div>
            </div>
          ))}
        </div>
      </div>

      {/*
        The legend says what the two colours mean rather than restating the
        numbers: the shading is a ranking device, and a reader who wants a value
        has it printed in the cell.
      */}
      <div className="heat-legend">
        <span>
          <i className="heat-swatch heat-calm-1" />
          <i className="heat-swatch heat-calm-2" />
          <i className="heat-swatch heat-calm-4" />
          current, nothing to do
        </span>
        <span>
          <i className="heat-swatch heat-urgent-1" />
          <i className="heat-swatch heat-urgent-2" />
          <i className="heat-swatch heat-urgent-4" />
          needs acting on
        </span>
        <span className="heat-legend-note">
          darker is more, against the biggest cell in that colour
        </span>
      </div>
    </section>
  );
}

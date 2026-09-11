import type { DemandSupplyRow } from "@/lib/governance";

/**
 * Unmet demand against built supply, per service (v4.13).
 *
 * This is the other half of what "Status by service" held, in the shape that
 * makes it answerable. The table had the same two numbers in columns three
 * apart and left the reader to subtract them six times; a centre line does the
 * subtraction in the layout, so "Finance Operations is furthest behind" is
 * seen rather than worked out.
 *
 * Both sides share one scale — the widest single value across every service —
 * or the bars would compare each row only against itself and a service with
 * fifteen open ideas would look like a service with three. Rows are ordered by
 * the gap, largest first, because "who is furthest behind" is the only reason
 * anyone opens this, and the gap is printed in its own column: left bars are
 * aligned to the centre line, so their outer ends are ragged and an ordering by
 * gap cannot be checked by eye. Printing it keeps the sort honest.
 *
 * A zero-width bar still shows a hairline. A service with nothing built is a
 * real finding and must not read as a rendering failure.
 */
export default function DemandSupplyWidget({ rows }: { rows: DemandSupplyRow[] }) {
  const scale = Math.max(1, ...rows.flatMap((r) => [r.unmet, r.built]));
  const pct = (n: number) => (n / scale) * 100;

  return (
    <section className="widget wide" id="status-by-service">
      <h2>Demand against supply</h2>
      <p className="widget-sub">
        Ideas still open or in progress on the left; solutions built on the
        right. Both sides are drawn to one shared scale, so services are
        comparable with each other, not just with themselves.
      </p>

      <div className="ds-head" aria-hidden="true">
        <span className="ds-head-left">Waiting</span>
        <span className="ds-head-right">Built</span>
        <span className="ds-head-gap">Gap</span>
      </div>

      <div className="ds-rows">
        {rows.map((r) => {
          const gap = r.unmet - r.built;
          return (
            <div className="ds-row" key={r.org}>
              <span className="ds-org">
                {/* §4.7 cross-navigation: the service opens the board pre-filtered. */}
                <a href={`/?service=${encodeURIComponent(r.org)}`}>{r.org}</a>
              </span>

              <span className="ds-n ds-n-left">{r.unmet}</span>
              <div className="ds-bar ds-bar-left">
                <div className="ds-fill ds-fill-unmet" style={{ width: `${pct(r.unmet)}%` }} />
              </div>
              <div className="ds-bar ds-bar-right">
                <div className="ds-fill ds-fill-built" style={{ width: `${pct(r.built)}%` }} />
              </div>
              <span className="ds-n ds-n-right">{r.built}</span>

              {/*
                The gap is printed, not left to the eye (v4.13). The rows are
                ordered by it, and in a diverging chart the left bars are
                aligned to the centre line, so their outer ends are ragged and
                the ordering cannot be checked visually. An ordering a reader
                cannot verify is the same failure as the table this replaced.
              */}
              <span className={"ds-gap" + (gap > 0 ? " is-behind" : "")}>
                {gap > 0 ? `+${gap}` : gap === 0 ? "level" : gap}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

import type { ThroughputPoint } from "@/lib/governance";

interface Props {
  points: ThroughputPoint[];
  conversionPct: number;
}

export default function ThroughputWidget({ points, conversionPct }: Props) {
  const max = Math.max(1, ...points.map((p) => Math.max(p.ideasSubmitted, p.solutionsBuilt)));
  const mid = Math.round(max / 2);
  // Thin out month labels when there are many months.
  const labelEvery = Math.ceil(points.length / 12);

  return (
    <section className="widget">
      <h2>Build throughput</h2>
      <p className="widget-sub">
        Ideas submitted versus solutions built, by month. Conversion so far:{" "}
        {conversionPct}% of submitted ideas have a built, linked solution.
      </p>
      <div className="big-figure">
        {conversionPct}
        <span className="unit">% of ideas became solutions</span>
      </div>

      {/* Legend reads first, before scanning the bars — Addendum A §4.1. */}
      <div className="legend legend-top">
        <span className="legend-item">
          <span className="dot" style={{ background: "var(--status-open)" }} /> ideas submitted
        </span>
        <span className="legend-item">
          <span className="dot tp-swatch-solutions" /> solutions built
        </span>
      </div>

      {/* Chart with y-axis reference gridlines at 0 / mid / max — §4.1. */}
      <div className="tp-chart-wrap" aria-hidden="true">
        <div className="tp-yaxis">
          <span style={{ top: 0 }}>{max}</span>
          <span style={{ top: "50%" }}>{mid}</span>
          <span style={{ top: "100%" }}>0</span>
        </div>
        <div className="tp-plot">
          <div className="tp-gridline g-top" />
          <div className="tp-gridline g-mid" />
          <div className="tp-gridline g-base" />
          <div className="tp-chart">
            {points.map((p) => (
              <div className="tp-col" key={p.month}>
                <div className="tp-bar ideas" style={{ height: `${(p.ideasSubmitted / max) * 100}%` }} />
                <div
                  className="tp-bar solutions"
                  style={{ height: `${(p.solutionsBuilt / max) * 100}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="tp-labels" aria-hidden="true">
        {points.map((p, i) => (
          <span key={p.month}>{i % labelEvery === 0 ? p.month.slice(2) : ""}</span>
        ))}
      </div>
    </section>
  );
}


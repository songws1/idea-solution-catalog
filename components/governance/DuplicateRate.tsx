import type { DuplicateRateRow } from "@/lib/governance";

export default function DuplicateRate({ rows }: { rows: DuplicateRateRow[] }) {
  const maxPct = Math.max(1, ...rows.map((r) => r.pct));

  return (
    <section className="widget">
      {/* v3 §1: this heading is "Duplicate rate by service" even though the lib
          function stays duplicateRateByOrg; stored `org` renders as "Service". */}
      <h2>Duplicate rate by service</h2>
      <p className="widget-sub">
        Records with at least one duplicate candidate or confirmed duplicate
        link, as a share of that service&rsquo;s ideas and solutions. This is the
        core waste metric — flagged records are review candidates, not confirmed
        waste.
      </p>
      {rows.map((r) => (
        <div className="bar-row" key={r.org}>
          <span>{r.org}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(r.pct / maxPct) * 100}%` }} />
          </div>
          <span style={{ textAlign: "right" }}>
            {r.pct}% ({r.flagged}/{r.records})
          </span>
        </div>
      ))}
    </section>
  );
}

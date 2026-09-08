import type { AgingRow } from "@/lib/governance";

interface Props {
  data: { ideas: AgingRow[]; solutions: AgingRow[] };
}

/**
 * Zero is a real count, not missing data (v3 §4.5). An em dash reads as "no
 * figure available", which is a different and wrong claim, so zeros render as
 * `0` and are only muted.
 */
function Count({ n, urgent = false }: { n: number; urgent?: boolean }) {
  if (n === 0) return <span className="num-zero">0</span>;
  return <span className={urgent ? "num-urgent" : undefined}>{n}</span>;
}

function Table({ rows, kind }: { rows: AgingRow[]; kind: "idea" | "solution" }) {
  const total = (r: AgingRow): number =>
    r.under30 + r.d30to90 + r.over90 + (kind === "solution" ? r.neverReviewed : 0);

  return (
    <table>
      <thead>
        {/* stored `org` renders as "Service" (v3 §1); rows are stored org values. */}
        <tr>
          <th scope="col">Service</th>
          <th scope="col">Under 30 days</th>
          <th scope="col">30 to 90</th>
          <th scope="col">Over 90</th>
          {kind === "solution" && <th scope="col">Never reviewed</th>}
          <th scope="col">Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.org}>
            <td>{r.org}</td>
            <td>
              <Count n={r.under30} />
            </td>
            <td>
              <Count n={r.d30to90} />
            </td>
            {/* The only urgent number on the widget carries the review color. */}
            <td>
              <Count n={r.over90} urgent />
            </td>
            {kind === "solution" && (
              <td>
                <Count n={r.neverReviewed} urgent />
              </td>
            )}
            <td className="num-total">
              <Count n={total(r)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AgingWidget({ data }: Props) {
  return (
    <section className="widget wide" id="aging">
      <h2>Aging</h2>
      <p className="widget-sub">
        Stalled ideas (time since submission, unsolved only) and unmaintained
        solutions (time since last review).
      </p>
      <h3 className="widget-subhead">Ideas awaiting resolution</h3>
      <Table rows={data.ideas} kind="idea" />
      <h3 className="widget-subhead">Solutions since last review</h3>
      <Table rows={data.solutions} kind="solution" />
    </section>
  );
}

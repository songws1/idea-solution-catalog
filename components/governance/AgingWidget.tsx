import type { AgingRow } from "@/lib/governance";

interface Props {
  data: { ideas: AgingRow[]; solutions: AgingRow[] };
}

function Table({ rows, kind }: { rows: AgingRow[]; kind: "idea" | "solution" }) {
  return (
    <table>
      <thead>
        <tr>
          <th scope="col">Org</th>
          <th scope="col">Under 30 days</th>
          <th scope="col">30 to 90</th>
          <th scope="col">Over 90</th>
          {kind === "solution" && <th scope="col">Never reviewed</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.org}>
            <td>{r.org}</td>
            <td>{r.under30 || "—"}</td>
            <td>{r.d30to90 || "—"}</td>
            <td>{r.over90 || "—"}</td>
            {kind === "solution" && <td>{r.neverReviewed || "—"}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AgingWidget({ data }: Props) {
  return (
    <section className="widget wide">
      <h2>Aging</h2>
      <p className="widget-sub">
        Stalled ideas (time since submission, unsolved only) and unmaintained
        solutions (time since last review).
      </p>
      <p className="widget-sub" style={{ marginBottom: 8 }}>
        <strong>Ideas awaiting resolution</strong>
      </p>
      <Table rows={data.ideas} kind="idea" />
      <p className="widget-sub" style={{ margin: "16px 0 8px" }}>
        <strong>Solutions since last review</strong>
      </p>
      <Table rows={data.solutions} kind="solution" />
    </section>
  );
}

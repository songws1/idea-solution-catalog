import type { StatusByOrgRow } from "@/lib/governance";

export default function StatusByOrgWidget({ rows }: { rows: StatusByOrgRow[] }) {
  return (
    <section className="widget wide" id="status-by-service">
      {/* v3 §1: stored `org` renders as "Service". The component name keeps the
          stored-field name; only rendered text changes. */}
      <h2>Status by service</h2>
      <p className="widget-sub">
        Ideas by portal status; solutions counted as linked to a solved idea or
        standing alone with no linked idea.
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">Service</th>
            <th scope="col">Open ideas</th>
            <th scope="col">In progress</th>
            <th scope="col">Solved</th>
            <th scope="col">Linked solutions</th>
            <th scope="col">Unlinked solutions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.org}>
              <td>
                {/* §4.7 cross-navigation: the service opens the board pre-filtered. */}
                <a href={`/?service=${encodeURIComponent(r.org)}`}>{r.org}</a>
              </td>
              <td>{r.ideasOpen}</td>
              <td>{r.ideasInProgress}</td>
              <td>{r.ideasSolved}</td>
              <td>{r.solutionsLinked}</td>
              <td>{r.solutionsOrphan === 0 ? <span className="num-zero">0</span> : r.solutionsOrphan}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

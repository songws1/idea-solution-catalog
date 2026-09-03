import type { StatusByOrgRow } from "@/lib/governance";

export default function StatusByOrgWidget({ rows }: { rows: StatusByOrgRow[] }) {
  return (
    <section className="widget wide">
      <h2>Status by org</h2>
      <p className="widget-sub">
        Ideas by portal status; solutions counted as linked to a solved idea or
        standing alone with no linked idea.
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">Org</th>
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
              <td>{r.org}</td>
              <td>{r.ideasOpen}</td>
              <td>{r.ideasInProgress}</td>
              <td>{r.ideasSolved}</td>
              <td>{r.solutionsLinked}</td>
              <td>{r.solutionsOrphan || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

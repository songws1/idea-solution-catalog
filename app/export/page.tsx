import { getDatasetVariant, loadDataset } from "@/lib/dataset";
import { IDEA_HEADERS, SOLUTION_HEADERS, variantLabel } from "@/lib/csv";

export const dynamic = "force-dynamic";

/**
 * One download card. The column list is rendered from the CSV writer's own
 * header array (v3 §5), so it cannot drift from the file the button produces.
 */
function ExportCard({
  title,
  count,
  noun,
  summary,
  columns,
  href,
  filename,
}: {
  title: string;
  count: number;
  noun: string;
  summary: string;
  columns: readonly string[];
  href: string;
  filename: string;
}) {
  return (
    <div className="export-item">
      <h2>{title}</h2>
      <p className="widget-sub">
        {count} {noun} records. {summary}
      </p>

      <a className="btn-primary" href={href} download={filename}>
        Download {filename}
      </a>

      <details className="export-columns">
        <summary>{columns.length} columns</summary>
        <ul>
          {columns.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export default function ExportPage() {
  const variant = getDatasetVariant();
  const dataset = loadDataset(variant);
  const label = variantLabel(variant);
  const ideaCount = dataset.ideas.length;
  const solutionCount = dataset.solutions.length;

  return (
    <div className="page">
      <div className="page-intro">
        <h1>CSV export</h1>
        <p className="lede">
          Two flat files — one row per idea, one row per solution. People are
          written as display names and duplicate flags are flattened to a count
          plus the flagged record ids.
        </p>
        <span className="dataset-note">
          Dataset: {label} · {ideaCount} ideas · {solutionCount} solutions
        </span>
      </div>

      <div className="export-note">
        <p>
          <strong>
            This is a point-in-time export of synthetic demo data, not a live
            feed.
          </strong>{" "}
          It reflects the {label} dataset this app is currently running against,
          as it exists right now — nothing here updates on its own, and nothing
          you do on this page writes back to the catalog.
        </p>
      </div>

      <div className="export-list">
        {/* v3 §1: page copy uses the UI labels; the CSV's own headers keep the
            stored names org and service, which the column lists below show. */}
        <ExportCard
          title="Ideas"
          count={ideaCount}
          noun="idea"
          summary="Service and sub-service, title and description, submitter and their manager, status, the linked solution, and duplicate flags."
          columns={IDEA_HEADERS}
          href="/export/download?type=ideas"
          filename={`ideas-${label}.csv`}
        />
        <ExportCard
          title="Solutions"
          count={solutionCount}
          noun="solution"
          summary="Solution type and technology, name, raw and AI-generated descriptions, tags, owner and builder, dates, and duplicate flags."
          columns={SOLUTION_HEADERS}
          href="/export/download?type=solutions"
          filename={`solutions-${label}.csv`}
        />
      </div>
    </div>
  );
}

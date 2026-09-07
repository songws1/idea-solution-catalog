import { getDatasetVariant, loadDataset } from "@/lib/dataset";
import { variantLabel } from "@/lib/csv";

export const dynamic = "force-dynamic";

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
          Download the catalog as two flat CSV files — one row per idea and one
          row per solution, with people shown by display name and duplicate
          flags flattened to a count plus the flagged record IDs.
        </p>
        <span className="dataset-note">
          Dataset: {label} · {ideaCount} ideas · {solutionCount} solutions
        </span>
      </div>

      <div className="export-note">
        <p>
          <strong>This is a point-in-time export of synthetic demo data, not a
          live feed.</strong>{" "}
          It reflects the {label} dataset this app is currently running against,
          as it exists right now — nothing here updates on its own, and nothing
          you do on this page writes back to the catalog.
        </p>
      </div>

      <div className="export-list">
        <div className="export-item">
          <h2>Ideas</h2>
          <p className="widget-sub">
            {/* v3 §1: copy uses the UI labels — the CSV's own column headers keep
                the stored names org/service. */}
            All {ideaCount} idea records: service, sub-service, title,
            description, submitter and their manager (as names), status, linked
            solution, and duplicate flags (count + flagged record IDs).
          </p>
          <a
            className="artifact-button"
            href={`/export/download?type=ideas`}
            download={`ideas-${label}.csv`}
          >
            Download ideas-{label}.csv
          </a>
        </div>
        <div className="export-item">
          <h2>Solutions</h2>
          <p className="widget-sub">
            All {solutionCount} solution records: artifact type, name, raw and
            AI-generated descriptions, tags, owner and builder (as names), dates,
            and duplicate flags (count + flagged record IDs).
          </p>
          <a
            className="artifact-button"
            href={`/export/download?type=solutions`}
            download={`solutions-${label}.csv`}
          >
            Download solutions-{label}.csv
          </a>
        </div>
      </div>
    </div>
  );
}

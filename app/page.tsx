import CatalogHome from "@/components/catalog/CatalogHome";
import { getDatasetVariant, loadDataset } from "@/lib/dataset";
import { toClientDataset } from "@/lib/client-records";
import { buildSolutionMeta } from "@/lib/catalog-filters";

/**
 * Catalog landing page (Addendum A §1): search bar dominant at top, unified
 * two-tier browse filter bar, box-based solution grid with open ideas below.
 * The dataset is loaded server-side; only client-shaped records (no
 * embeddings, names resolved) are passed down, via the same toClientDataset
 * the /api/search route uses.
 */
export const dynamic = "force-dynamic";

export default function Home() {
  const variant = getDatasetVariant();
  const dataset = loadDataset(variant);
  const catalog = toClientDataset(dataset);
  const solutionMeta = buildSolutionMeta(dataset);
  const recordCount = dataset.ideas.length + dataset.solutions.length;

  return (
    <div className="page">
      <div className="page-intro">
        <h1>Idea + solution catalog</h1>
        <p className="lede">
          Ask in your own words, or browse what has already been built. The
          catalog holds improvement ideas and the solutions that resolved them,
          linked, so you can see whether something has already been solved and
          go get the thing.
        </p>
        <span className="dataset-note">
          Dataset: {variant === "pre" ? "pre-enrichment" : "post-enrichment"} ·{" "}
          {recordCount} records
        </span>
      </div>
      <CatalogHome
        variant={variant}
        catalog={catalog}
        solutionMeta={solutionMeta}
      />
    </div>
  );
}

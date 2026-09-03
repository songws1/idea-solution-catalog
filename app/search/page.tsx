import SearchView from "@/components/search/SearchView";
import { getDatasetVariant, loadDataset } from "@/lib/dataset";

export const dynamic = "force-dynamic";

export default function SearchPage() {
  const variant = getDatasetVariant();
  const dataset = loadDataset(variant);
  const recordCount = dataset.ideas.length + dataset.solutions.length;

  return (
    <div className="page">
      <div className="page-intro">
        <h1>Search the catalog</h1>
        <p className="lede">
          Ask in your own words. The search runs across improvement ideas and the
          solutions that were built to resolve them, side by side, so you can see
          whether something has already been solved and go get the thing.
        </p>
        <span className="dataset-note">
          Dataset: {variant === "pre" ? "pre-enrichment" : "post-enrichment"} ·{" "}
          {recordCount} records
        </span>
      </div>
      <SearchView variant={variant} />
    </div>
  );
}

import CheckForm from "@/components/check/CheckForm";
import CatalogHome from "@/components/catalog/CatalogHome";
import { getDatasetVariant, loadDataset } from "@/lib/dataset";
import { toClientDataset } from "@/lib/client-records";
import { buildSolutionMeta } from "@/lib/catalog-filters";

/**
 * Landing page (v4.5).
 *
 * The page now leads with the overlap check rather than the board. The thesis
 * of this catalog is "do not build what already exists"; the catalog is the
 * means and the check is the end, and leading with the board led with the
 * means. Nobody searches a catalog they have not remembered exists, so the
 * front door asks the question instead of waiting to be asked.
 *
 * The board stays on the same page, below, rather than moving behind a click.
 * That is deliberate: the check needs an API key and spends credit on every
 * run, so a bare check page would show an error as its front door the moment a
 * key is missing or credits run out. The board renders from committed data with
 * no API call at all, so the page always has something real on it, a "nothing
 * matches" verdict always has somewhere to go next, and a first-time visitor
 * can see that the catalog holds actual records.
 */
export const dynamic = "force-dynamic";

export default function Home() {
  const variant = getDatasetVariant();
  const dataset = loadDataset(variant);
  const catalog = toClientDataset(dataset);
  const solutionMeta = buildSolutionMeta(dataset);
  const ideaCount = dataset.ideas.length;
  const solutionCount = dataset.solutions.length;

  return (
    <div className="page">
      <div className="page-intro">
        <h1>Before you build it, check it does not exist</h1>
        <p className="lede">
          Describe what you are about to build. This compares it against every
          record in the catalog by meaning and tells you whether it has already
          been built, whether someone has already asked for it, or whether the
          way is clear.
        </p>
        <span className="dataset-note">
          Dataset: {variant === "pre" ? "pre-enrichment" : "post-enrichment"} ·{" "}
          {solutionCount} built solutions · {ideaCount} ideas
        </span>
      </div>

      <CheckForm solutionMeta={solutionMeta} />

      <CatalogHome
        variant={variant}
        catalog={catalog}
        solutionMeta={solutionMeta}
      />
    </div>
  );
}

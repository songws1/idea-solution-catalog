import CheckForm from "@/components/check/CheckForm";
import { getDatasetVariant, loadDataset } from "@/lib/dataset";
import { buildSolutionMeta } from "@/lib/catalog-filters";

/**
 * "Before you build" check.
 *
 * The catalog exists so that people do not build the same thing twice, but
 * browse and search only reach the person who already thought to look. This is
 * the same retrieval pointed at the moment that actually decides whether effort
 * gets duplicated: someone is about to start, and describes what they intend to
 * build. In the production shape of this idea, this is a step inside the intake
 * form rather than a page someone chooses to visit.
 */
export const dynamic = "force-dynamic";

export default function CheckPage() {
  const dataset = loadDataset(getDatasetVariant());
  const solutionMeta = buildSolutionMeta(dataset);
  const solutionCount = dataset.solutions.length;
  const ideaCount = dataset.ideas.length;

  return (
    <div className="page">
      <div className="page-intro">
        <h1>Before you build</h1>
        <p className="lede">
          Describe what you are about to build. This compares it against every
          record in the catalog by meaning and tells you whether it already
          exists, whether someone has already asked for it, or whether the way
          is clear.
        </p>
        <span className="dataset-note">
          Checking against {solutionCount} built solutions and {ideaCount} ideas
        </span>
      </div>

      <CheckForm solutionMeta={solutionMeta} />
    </div>
  );
}

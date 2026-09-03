import { getDatasetVariant, loadDataset } from "@/lib/dataset";
import {
  agingData,
  duplicateClusters,
  duplicateRateByOrg,
  orgDotGrid,
  reuseSavings,
  statusByOrg,
  throughput,
} from "@/lib/governance";
import StatusByOrgWidget from "@/components/governance/StatusByOrg";
import AgingWidget from "@/components/governance/AgingWidget";
import ThroughputWidget from "@/components/governance/ThroughputWidget";
import DuplicateRate from "@/components/governance/DuplicateRate";
import OrgDotGrid from "@/components/governance/OrgDotGrid";
import ReuseSavings from "@/components/governance/ReuseSavings";
import DuplicateClusters from "@/components/governance/DuplicateClusters";

export const dynamic = "force-dynamic";

export default function GovernancePage() {
  const variant = getDatasetVariant();
  const dataset = loadDataset(variant);

  const status = statusByOrg(dataset);
  const aging = agingData(dataset);
  const tp = throughput(dataset);
  const dupRate = duplicateRateByOrg(dataset);
  const dots = orgDotGrid(dataset);
  const clusters = duplicateClusters(dataset);
  const savings = reuseSavings(dataset);

  const totalRecords = dataset.ideas.length + dataset.solutions.length;
  const flaggedRecords = [...dataset.ideas, ...dataset.solutions].filter(
    (r) => r.duplicate_candidates.length > 0 || r.duplicate_of
  ).length;

  return (
    <div className="page">
      <div className="page-intro">
        <h1>Catalog governance</h1>
        <p className="lede">
          Catalog health at a glance: status, aging, throughput, and the scale of
          duplication across {totalRecords} records in {status.length} orgs. All
          figures are derived from the dataset&rsquo;s static fields; duplicate
          flags are review candidates produced offline, not auto-merges.
        </p>
        <span className="dataset-note">
          Dataset: {variant === "pre" ? "pre-enrichment" : "post-enrichment"} ·{" "}
          {flaggedRecords} of {totalRecords} records carry at least one duplicate
          flag
        </span>
      </div>

      <div className="gov-grid">
        <StatusByOrgWidget rows={status} />
        <AgingWidget data={aging} />
        <ThroughputWidget points={tp.points} conversionPct={tp.conversionPct} />
        <DuplicateRate rows={dupRate} />
        <OrgDotGrid rows={dots} />
        <ReuseSavings savings={savings} />
        <DuplicateClusters clusters={clusters} dataset={dataset} />
      </div>
    </div>
  );
}

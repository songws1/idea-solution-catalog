import { getDatasetVariant, loadDataset } from "@/lib/dataset";
import {
  agingData,
  duplicateClusters,
  duplicateRateByOrg,
  orgDotGrid,
  statusByOrg,
  summaryTiles,
  throughput,
} from "@/lib/governance";
import SummaryTiles from "@/components/governance/SummaryTiles";
import StatusByOrgWidget from "@/components/governance/StatusByOrg";
import AgingWidget from "@/components/governance/AgingWidget";
import ThroughputWidget from "@/components/governance/ThroughputWidget";
import DuplicateRate from "@/components/governance/DuplicateRate";
import OrgDotGrid from "@/components/governance/OrgDotGrid";
import DuplicateClusters from "@/components/governance/DuplicateClusters";

export const dynamic = "force-dynamic";

export default function GovernancePage() {
  const variant = getDatasetVariant();
  const dataset = loadDataset(variant);

  const tiles = summaryTiles(dataset);
  const status = statusByOrg(dataset);
  const aging = agingData(dataset);
  const tp = throughput(dataset);
  const dupRate = duplicateRateByOrg(dataset);
  const dots = orgDotGrid(dataset);
  const clusters = duplicateClusters(dataset);

  const totalRecords = dataset.ideas.length + dataset.solutions.length;

  return (
    <div className="page">
      <div className="page-intro">
        <h1>Catalog governance</h1>
        <p className="lede">
          Catalog health at a glance across {totalRecords} records in{" "}
          {status.length} services. Every figure is counted from the
          dataset&rsquo;s static fields; duplicate flags are review candidates
          produced offline, never auto-merges.
        </p>
        <span className="dataset-note">
          Dataset: {variant === "pre" ? "pre-enrichment" : "post-enrichment"}
        </span>
      </div>

      {/* §4.1 — the four numbers a reviewer needs before reading any table. */}
      <SummaryTiles tiles={tiles} />

      {/*
        §4.2 widget order: lead with what is actionable. Clusters and aging are
        the two things a reviewer can do something about today; status, rate and
        throughput are context; the dot grid is a closing overview.
      */}
      <div className="gov-grid">
        <DuplicateClusters clusters={clusters} dataset={dataset} />
        <AgingWidget data={aging} />
        <StatusByOrgWidget rows={status} />
        <DuplicateRate rows={dupRate} />
        <ThroughputWidget points={tp.points} conversionPct={tp.conversionPct} />
        <OrgDotGrid rows={dots} />
      </div>
    </div>
  );
}

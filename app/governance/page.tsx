import { getDatasetVariant, loadDataset } from "@/lib/dataset";
import {
  agingData,
  demandSupply,
  duplicateClusters,
  programFunnel,
  summaryTiles,
  throughput,
} from "@/lib/governance";
import SummaryTiles from "@/components/governance/SummaryTiles";
import ProgramFunnelWidget from "@/components/governance/ProgramFunnel";
import DemandSupplyWidget from "@/components/governance/DemandSupply";
import AgingWidget from "@/components/governance/AgingWidget";
import ThroughputWidget from "@/components/governance/ThroughputWidget";
import DuplicateClusters from "@/components/governance/DuplicateClusters";

export const dynamic = "force-dynamic";

export default function GovernancePage() {
  const variant = getDatasetVariant();
  const dataset = loadDataset(variant);

  const tiles = summaryTiles(dataset);
  const supply = demandSupply(dataset);
  const funnel = programFunnel(dataset);
  const aging = agingData(dataset);
  const tp = throughput(dataset);
  const clusters = duplicateClusters(dataset);

  const totalRecords = dataset.ideas.length + dataset.solutions.length;

  return (
    <div className="page">
      <div className="page-intro">
        <h1>Catalog governance</h1>
        <p className="lede">
          Catalog health at a glance across {totalRecords} records in{" "}
          {supply.length} services. Every figure is counted from the
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
        Widget order (v4.13). Seven widgets became five, and the two that
        arrived replaced three that left, so the page states each fact once.
        Order is diagnosis, then work, then context:

          funnel        where the program loses ideas — the first question
          demand/supply which service is furthest behind (was a six-column table)
          clusters      the queue, banded by what to do, cheapest action first
          aging         what has gone quiet
          throughput    the trend behind all of it

        Out: "Duplicate rate by service" said the cluster finding a second time
        as a percentage nobody could act on, and the org dot grid drew 182 dots
        the reader had to count to recover numbers printed elsewhere.
      */}
      <div className="gov-grid">
        <ProgramFunnelWidget funnel={funnel} />
        <DemandSupplyWidget rows={supply} />
        <DuplicateClusters clusters={clusters} dataset={dataset} />
        <AgingWidget data={aging} />
        <ThroughputWidget points={tp.points} conversionPct={tp.conversionPct} />
      </div>
    </div>
  );
}

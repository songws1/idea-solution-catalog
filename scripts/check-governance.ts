/**
 * Governance-page invariants (v4.13). Offline, no API key, no spend.
 *
 * The page was rebuilt around two claims that are easy to state and easy to
 * break silently: the funnel's stages really nest, and every cluster lands in
 * exactly one band whose label is true of its members. Both are the kind of
 * thing that stays right until someone adds a status value, at which point a
 * record quietly falls out of a total and nothing complains.
 *
 * These assert the arithmetic, not the rendering. Where a figure appears in two
 * places they are checked against each other rather than against a constant,
 * because a hard-coded expectation is how phase4-check went stale in v4.9 and
 * did not fail.
 *
 * Run: npx tsx scripts/check-governance.ts
 */
import { getDatasetVariant, loadDataset } from "../lib/dataset";
import {
  CLUSTER_BAND_ORDER,
  demandSupply,
  duplicateClusters,
  programFunnel,
  summaryTiles,
  orgOfSolution,
} from "../lib/governance";
import type { IdeaRecord } from "../lib/types";

const variant = getDatasetVariant();
const dataset = loadDataset(variant);

let failures = 0;
function check(label: string, ok: boolean, extra = ""): void {
  console.log(`${ok ? "OK  " : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures += 1;
}

/* ---- funnel ------------------------------------------------------------- */

const funnel = programFunnel(dataset);
const [raised, started, built] = funnel.stages;

check(
  "the funnel starts from every idea",
  raised.value === dataset.ideas.length,
  `${raised.value} of ${dataset.ideas.length}`
);
check(
  "stages nest, never widen",
  raised.value >= started.value && started.value >= built.value,
  `${raised.value} ≥ ${started.value} ≥ ${built.value}`
);
check(
  "each drop is exactly the gap it sits under",
  raised.lost?.count === raised.value - started.value &&
    started.lost?.count === started.value - built.value,
  `${raised.lost?.count} + ${started.lost?.count}`
);
check(
  "the stages and their drops account for every idea",
  built.value + (raised.lost?.count ?? 0) + (started.lost?.count ?? 0) === dataset.ideas.length,
  `${dataset.ideas.length} ideas`
);
check(
  "the last stage has nothing left to lose",
  built.lost === null
);

/**
 * The funnel counts ideas and `unrequested` counts solutions, so the only way
 * to catch a mix-up is to recount the solutions independently: the ones with a
 * request behind them plus the ones without must be all of them.
 */
const withRequest = dataset.solutions.filter((s) => s.resolves_idea_id).length;
check(
  "unrequested builds are the solutions with no idea behind them",
  withRequest + funnel.unrequested === dataset.solutions.length,
  `${withRequest} + ${funnel.unrequested} = ${funnel.totalSolutions}`
);

/* ---- demand against supply ---------------------------------------------- */

const supply = demandSupply(dataset);
const unmetTotal = supply.reduce((n, r) => n + r.unmet, 0);
const builtTotal = supply.reduce((n, r) => n + r.built, 0);

check(
  "every unsolved idea is counted in exactly one service",
  unmetTotal === dataset.ideas.filter((i) => i.status !== "solved").length,
  `${unmetTotal}`
);
check(
  "every solution is counted in exactly one service",
  builtTotal === dataset.solutions.length,
  `${builtTotal} of ${dataset.solutions.length}`
);
check(
  "the waiting side of the funnel and of this widget agree",
  unmetTotal === (raised.lost?.count ?? 0) + (started.lost?.count ?? 0),
  `${unmetTotal}`
);
check(
  "rows are ordered by the gap, widest first",
  supply.every((r, i) => i === 0 || supply[i - 1].unmet - supply[i - 1].built >= r.unmet - r.built),
  supply.map((r) => `${r.unmet - r.built}`).join(" ")
);
check(
  "no service appears twice",
  new Set(supply.map((r) => r.org)).size === supply.length
);

/**
 * The widget's shared scale is only honest if it really is the widest value.
 * A bar drawn past its track would mean the scale was computed from one side.
 */
const scale = Math.max(1, ...supply.flatMap((r) => [r.unmet, r.built]));
check(
  "no bar exceeds the shared scale",
  supply.every((r) => r.unmet <= scale && r.built <= scale),
  `scale ${scale}`
);

/* ---- cluster bands ------------------------------------------------------ */

const clusters = duplicateClusters(dataset);

check(
  "every cluster has a band",
  clusters.every((c) => CLUSTER_BAND_ORDER.includes(c.band))
);
check(
  "clusters are ordered cheapest action first",
  clusters.every(
    (c, i) =>
      i === 0 ||
      CLUSTER_BAND_ORDER.indexOf(clusters[i - 1].band) <= CLUSTER_BAND_ORDER.indexOf(c.band)
  ),
  clusters.map((c) => c.band).join(" ")
);

/**
 * The band labels are promises about the records, and a wrong one sends
 * somebody to close a request that nothing satisfies. Each is re-derived here
 * from the members rather than trusted.
 */
let bandLies = 0;
let firstLie = "";
for (const c of clusters) {
  const ideas = c.members.map((m) => m.record).filter((r): r is IdeaRecord => r.doc_type === "idea");
  const solved = ideas.filter((i) => i.status === "solved").length;
  const unsolved = ideas.length - solved;
  let ok: boolean;
  if (c.band === "ask-answered") {
    // "Already built, still being asked for" needs both halves to be present.
    ok = c.docType === "idea" && solved > 0 && unsolved > 0;
  } else if (c.band === "none-built") {
    ok = c.docType === "idea" && solved === 0 && unsolved === ideas.length;
  } else {
    // Two flagged solutions, or duplicate requests that each got their own build.
    ok = c.docType === "solution" || (ideas.length > 0 && solved === ideas.length);
  }
  if (!ok) {
    bandLies += 1;
    if (!firstLie) firstLie = `${c.band}: ${c.docType}, ${solved} solved / ${unsolved} unsolved`;
  }
}
check("every band label is true of its members", bandLies === 0, firstLie || `${clusters.length} checked`);

check(
  "a cluster is never a single record",
  clusters.every((c) => c.members.length >= 2)
);
check(
  "no record is filed in two clusters",
  (() => {
    const seen = new Set<string>();
    for (const c of clusters) {
      for (const m of c.members) {
        if (seen.has(m.record.id)) return false;
        seen.add(m.record.id);
      }
    }
    return true;
  })()
);

/**
 * Every band must actually occur. A band that never fires is copy nobody has
 * read, and the dataset is the only place this prototype can prove the three
 * cases are distinguishable at all.
 */
const present = new Set(clusters.map((c) => c.band));
check(
  "all three bands occur in the dataset",
  CLUSTER_BAND_ORDER.every((b) => present.has(b)),
  [...present].join(", ")
);

/* ---- tiles still point at something ------------------------------------- */

const tiles = summaryTiles(dataset);
const anchors = new Set(["funnel", "status-by-service", "aging", "duplicate-clusters"]);
check(
  "every summary tile links to a widget that still exists",
  tiles.every((t) => anchors.has(t.anchor)),
  tiles.map((t) => t.anchor).join(", ")
);
check(
  "the flagged tile matches the clusters below it",
  tiles.find((t) => t.anchor === "duplicate-clusters")?.value ===
    clusters.reduce((n, c) => n + c.members.length, 0),
  `${tiles.find((t) => t.anchor === "duplicate-clusters")?.value}`
);

/* ---- services resolve --------------------------------------------------- */

check(
  "no solution lands in an unnamed service",
  dataset.solutions.every((s) => orgOfSolution(dataset, s).length > 0)
);

console.log(
  failures === 0 ? "\nGOVERNANCE CHECKS: ALL PASS" : `\nGOVERNANCE CHECKS: ${failures} FAILURE(S)`
);
process.exit(failures === 0 ? 0 : 1);

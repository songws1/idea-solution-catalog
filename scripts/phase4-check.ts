/* Phase 4 verification harness (temporary): exercises lib/catalog-filters.ts
 * and lib/kanban.ts against the real dataset — offline, no API calls. */
import { getDatasetVariant, loadDataset } from "../lib/dataset";
import {
  buildSolutionMeta,
  deriveFilterOptions,
  applyFilters,
  facetCounts,
  EMPTY_FILTERS,
  SOLUTION_ONLY_FACETS,
  type FilterState,
} from "../lib/catalog-filters";
import { buildKanbanColumns } from "../lib/kanban";
import { toClientDataset } from "../lib/client-records";
import type { ClientScoredResult, IdeaRecord, SolutionRecord } from "../lib/types";
import { TAG_TAXONOMY } from "../lib/tag-taxonomy";

const variant = getDatasetVariant();
const dataset = loadDataset(variant);
let failures = 0;
function check(label: string, ok: boolean, extra = "") {
  console.log(`${ok ? "OK  " : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures += 1;
}

/* ---- buildSolutionMeta ------------------------------------------------- */
const meta = buildSolutionMeta(dataset);
check("solutionMeta covers all solutions", Object.keys(meta).length === dataset.solutions.length);
const sol1 = meta["sol-0001"];
const idea1 = dataset.ideas.find((i) => i.id === "idea-0001")!;
check(
  "sol-0001 org/service inherited from linked idea",
  sol1.org === idea1.org && sol1.service === idea1.service,
  `${sol1.org}, ${sol1.service}`
);
for (const orphanId of ["sol-0024", "sol-0025"]) {
  const m = meta[orphanId];
  check(`${orphanId} (orphan) has resolved org+service`, Boolean(m?.org && m?.service), `${m?.org}, ${m?.service}`);
}

/* ---- client dataset (same shape the landing page passes down) ---------- */
const catalog = toClientDataset(dataset);

/* ---- deriveFilterOptions ----------------------------------------------- */
const options = deriveFilterOptions(catalog, meta);
// Both of these hard-coded a count until v4.10 (20 tags, 5 orgs) and both went
// stale in v4.9 when the taxonomy grew to 26 and General Business Process was
// added. Neither failed at the time, because the datasets had not been
// regenerated yet and the check was reading the old 88-record files — a check
// that passes against stale data is worse than no check. They now assert the
// invariant that actually matters: the filter offers exactly the fixed
// taxonomy, and exactly the orgs the data contains.
check(
  "taxonomy options = the whole fixed taxonomy, in order",
  options.tags.length === TAG_TAXONOMY.length &&
    options.tags.every((t, i) => t === TAG_TAXONOMY[i]),
  `${options.tags.length} of ${TAG_TAXONOMY.length}`
);
const orgsInData = new Set<string>([
  ...catalog.ideas.map((i) => i.org),
  ...Object.values(meta).map((m) => m.org),
]);
check(
  "org options = every org present in the data",
  options.orgs.length === orgsInData.size &&
    options.orgs.every((o) => orgsInData.has(o)),
  options.orgs.join(", ")
);
const canon = ["ChatGPT", "Claude", "AI + RPA", "AI + local automation", "Local automation", "RPA", "Process improvement", "Other"];
check(
  "technology options in canonical order",
  options.technologyTypes.every((t) => canon.includes(t)) &&
    options.technologyTypes.every((t, i) => i === 0 || canon.indexOf(t) > canon.indexOf(options.technologyTypes[i - 1])),
  options.technologyTypes.join(" | ")
);
check("year options include 2025 and 2026", options.years.includes("2025") && options.years.includes("2026"));

/* ---- applyFilters ------------------------------------------------------- */
const expectedOpen = catalog.ideas.filter((i) => i.status !== "solved" && !i.linked_solution_id).length;
const all = applyFilters(catalog, meta, EMPTY_FILTERS);
check("no filters -> all 25 solutions", all.solutions.length === dataset.solutions.length);
check(`no filters -> ${expectedOpen} open ideas`, all.ideas.length === expectedOpen);

const tagF = { ...EMPTY_FILTERS, tags: ["invoice-processing"] };
const tagApplied = applyFilters(catalog, meta, tagF);
check(
  "tag filter: every solution carries the tag",
  tagApplied.solutions.length > 0 && tagApplied.solutions.every((s) => s.category_tags.includes("invoice-processing")),
  `${tagApplied.solutions.length} solutions`
);
check(
  "tag filter: ideas matched via solution_tags (post-enrichment)",
  tagApplied.ideas.every((i) => i.solution_tags.includes("invoice-processing"))
);

const andF = { ...EMPTY_FILTERS, orgs: ["Finance Operations"], technologyTypes: ["RPA"] };
const andApplied = applyFilters(catalog, meta, andF);
check(
  "AND across facets (org + technology)",
  andApplied.solutions.every((s) => meta[s.id].org === "Finance Operations" && s.technology_type === "RPA"),
  `${andApplied.solutions.length} solutions`
);

const yearF = { ...EMPTY_FILTERS, years: ["2026"] };
const yearApplied = applyFilters(catalog, meta, yearF);
check(
  "year filter subsets the grid",
  yearApplied.solutions.length > 0 &&
    yearApplied.solutions.length < dataset.solutions.length &&
    yearApplied.solutions.every((s) => s.date_built.startsWith("2026")),
  `${yearApplied.solutions.length} solutions`
);
/* ---- facetCounts (v4.12) ------------------------------------------------
 * A count that does not equal what selecting the value actually produces is
 * worse than no count: it promises records and delivers a different number, in
 * the one place added specifically to stop people hitting dead ends. So the
 * check is not "counts exist" but "every count, for every value, equals the
 * size of the board you get by selecting it" — verified by really applying
 * each filter. It runs under a non-empty filter state too, because the faceted
 * "own selection removed" rule is where this can go wrong silently.
 */
const boardPool = {
  ideas: catalog.ideas.filter((i) => i.status !== "solved" && !i.linked_solution_id),
  solutions: catalog.solutions,
};

function countsAgree(base: FilterState, label: string): void {
  const counts = facetCounts(boardPool.ideas, boardPool.solutions, meta, base);
  let mismatches = 0;
  let firstBad = "";
  let checked = 0;
  for (const key of Object.keys(counts) as (keyof FilterState)[]) {
    for (const [value, n] of Object.entries(counts[key])) {
      // Selecting one value REPLACES that facet's selection — which is exactly
      // the pool facetCounts counted against.
      const applied = applyFilters(catalog, meta, { ...base, [key]: [value] });
      // A solution-only facet does not filter ideas, so its count is a count
      // of solutions and is checked as one. The menu says so in words.
      const actual = SOLUTION_ONLY_FACETS.has(key)
        ? applied.solutions.length
        : applied.ideas.length + applied.solutions.length;
      checked += 1;
      if (actual !== n) {
        mismatches += 1;
        if (!firstBad) firstBad = `${key}/${value}: said ${n}, got ${actual}`;
      }
    }
  }
  check(
    `facet counts equal the board they produce (${label})`,
    mismatches === 0,
    mismatches === 0 ? `${checked} values verified` : firstBad
  );
}

countsAgree(EMPTY_FILTERS, "no filters");
countsAgree({ ...EMPTY_FILTERS, orgs: ["Finance Operations"] }, "one facet already active");
countsAgree(
  { ...EMPTY_FILTERS, orgs: ["Finance Operations"], artifactTypes: ["automation"] },
  "two facets already active"
);

/* A value at zero has to be genuinely unreachable, or greying it out lies. */
const zeroCounts = facetCounts(boardPool.ideas, boardPool.solutions, meta, EMPTY_FILTERS);
let zeroWrong = 0;
for (const key of Object.keys(zeroCounts) as (keyof FilterState)[]) {
  for (const value of options[key as keyof typeof options] ?? []) {
    if ((zeroCounts[key][value] ?? 0) !== 0) continue;
    const applied = applyFilters(catalog, meta, { ...EMPTY_FILTERS, [key]: [value] });
    const actual = SOLUTION_ONLY_FACETS.has(key)
      ? applied.solutions.length
      : applied.ideas.length + applied.solutions.length;
    if (actual > 0) zeroWrong += 1;
  }
}
check("values shown as empty really are empty", zeroWrong === 0, `${zeroWrong} wrongly greyed`);

console.log(`(offline checks through applyFilters done)`);

/* ---- buildKanbanColumns (synthetic result set from real records) -------- */
import { toClientIdea, toClientSolution } from "../lib/client-records";
function scored(record: IdeaRecord | SolutionRecord, via = false): ClientScoredResult {
  if (record.doc_type === "idea") {
    return { record: toClientIdea(record), score: 0.7, via_link: via, linked_id: null };
  }
  return { record: toClientSolution(record), score: 0.7, via_link: via, linked_id: null };
}
function ideaScored(id: string, via = false): ClientScoredResult | undefined {
  const r = dataset.ideas.find((i) => i.id === id);
  return r ? scored(r, via) : undefined;
}
function solScored(id: string, via = false): ClientScoredResult | undefined {
  const r = dataset.solutions.find((s) => s.id === id);
  return r ? scored(r, via) : undefined;
}

const inProgressId = dataset.ideas.find((i) => i.status === "in_progress")!.id;
const kbIdeas = [
  ideaScored("idea-0008"), // open, dups -> idea-0007 (solved, sol-0004) + idea-0006 (solved, sol-0003)
  ideaScored("idea-0007"), // solved, linked sol-0004 (in set) -> clusters
  ideaScored("idea-0006"), // solved, linked sol-0003 (in set) -> clusters
  ideaScored("idea-0005"), // solved, linked sol-0002 (NOT in set) -> unclusteredSolved
  ideaScored(inProgressId),
].filter(Boolean) as ClientScoredResult[];
const kbSols = [solScored("sol-0004"), solScored("sol-0003")].filter(Boolean) as ClientScoredResult[];

const kb = buildKanbanColumns(kbIdeas, kbSols);
check("Idea column = open ideas (idea-0008)", kb.ideaColumn.some((r) => r.record.id === "idea-0008"));
check("In progress column holds the in_progress idea", kb.inProgressColumn.some((r) => r.record.id === inProgressId));
check("Solution column = 2 clustered cards", kb.solutionColumn.length === 2);
const sol4card = kb.solutionColumn.find((c) => c.solution.record.id === "sol-0004");
check(
  "sol-0004 card clusters its solved idea idea-0007",
  Boolean(sol4card && sol4card.ideas.some((r) => r.record.id === "idea-0007"))
);
check("likelySolved: idea-0008 -> sol-0004", kb.likelySolved["idea-0008"] === "sol-0004");
check(
  "unclusteredSolved holds idea-0005 (solution not in set), not rendered",
  kb.unclusteredSolved.length === 1 && kb.unclusteredSolved[0].record.id === "idea-0005" &&
    !kb.solutionColumn.some((c) => c.ideas.some((r) => r.record.id === "idea-0005"))
);

console.log(failures === 0 ? "\nPHASE4 OFFLINE CHECKS: ALL PASS" : `\nPHASE4 OFFLINE CHECKS: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
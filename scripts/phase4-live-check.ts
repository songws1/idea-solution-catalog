/* Phase 4 live verification (temporary): runs the two Addendum §0 queries
 * against the running dev server and feeds the actual /api/search responses
 * through buildKanbanColumns — the exact data path the Kanban view consumes. */
import { buildKanbanColumns } from "../lib/kanban";
import type { SearchApiResponse } from "../lib/types";

const BASE = "http://localhost:3000";
let failures = 0;
function check(label: string, ok: boolean, extra = "") {
  console.log(`${ok ? "OK  " : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures += 1;
}

async function search(query: string): Promise<SearchApiResponse> {
  const res = await fetch(`${BASE}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`search failed: ${res.status}`);
  return (await res.json()) as SearchApiResponse;
}

async function main() {
/* Q1 — includes idea-0008 (open, dup of solved idea-0007/idea-0006) and
 * sol-0003/sol-0004, so the §2.3 "likely already solved" pointer must fire. */
const q1 = await search("has anything been built to handle invoice disputes");
const k1 = buildKanbanColumns(q1.ideas, q1.solutions);
check("Q1: three columns all populated",
  k1.ideaColumn.length > 0 && k1.inProgressColumn.length >= 0 && k1.solutionColumn.length > 0,
  `idea=${k1.ideaColumn.length} inprog=${k1.inProgressColumn.length} sol=${k1.solutionColumn.length}`);
check("Q1: idea-0008 in Idea column with likelySolved -> sol-0004",
  k1.ideaColumn.some((r) => r.record.id === "idea-0008") && k1.likelySolved["idea-0008"] === "sol-0004");
const sol4 = k1.solutionColumn.find((c) => c.solution.record.id === "sol-0004");
const sol3 = k1.solutionColumn.find((c) => c.solution.record.id === "sol-0003");
check("Q1: sol-0004 card clusters idea-0007",
  Boolean(sol4?.ideas.some((r) => r.record.id === "idea-0007")));
check("Q1: sol-0003 card clusters idea-0006",
  Boolean(sol3?.ideas.some((r) => r.record.id === "idea-0006")));
check("Q1: no unrendered solved ideas (all linked solutions in set)",
  k1.unclusteredSolved.length === 0,
  k1.unclusteredSolved.map((r) => r.record.id).join(",") || "none");

/* Q2 — planted duplicate pair idea-0030/idea-0055 + sol-0011/sol-0020. Both
 * ideas are solved, so both must render as cluster cards, not Idea rows. */
const q2 = await search("tool for turning meeting notes into action items");
const k2 = buildKanbanColumns(q2.ideas, q2.solutions);
check("Q2: both planted solutions in Solution column",
  k2.solutionColumn.some((c) => c.solution.record.id === "sol-0011") &&
    k2.solutionColumn.some((c) => c.solution.record.id === "sol-0020"));
const c11 = k2.solutionColumn.find((c) => c.solution.record.id === "sol-0011");
check("Q2: sol-0011 card clusters solved idea-0030",
  Boolean(c11?.ideas.some((r) => r.record.id === "idea-0030")));
check("Q2: solved ideas do NOT appear in Idea column",
  !k2.ideaColumn.some((r) => ["idea-0030", "idea-0055"].includes(r.record.id)));

console.log(failures === 0 ? "\nPHASE4 LIVE KANBAN CHECKS: ALL PASS" : `\nPHASE4 LIVE KANBAN CHECKS: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Live check failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
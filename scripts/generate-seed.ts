/**
 * Deterministic synthetic record generator (no LLM, no network).
 * Writes data/users.json and data/seed-records.json.
 * Seeded RNG + fixed content keeps output stable across runs.
 *
 * Run: npm run seed
 */
import fs from "node:fs";
import path from "node:path";
import { ORGS, type IdeaSeed, type SolutionSeed } from "./seed/types";
import { FINANCE_AP_IDEAS } from "./seed/ideas-finance-ap";
import { FINANCE_OTHER_IDEAS } from "./seed/ideas-finance-other";
import { HR_ONBOARDING_IDEAS } from "./seed/ideas-hr-onboarding";
import { HR_OTHER_IDEAS } from "./seed/ideas-hr-other";
import { PROCUREMENT_IDEAS } from "./seed/ideas-procurement";
import { FACILITIES_IDEAS } from "./seed/ideas-facilities";
import { IT_IDEAS } from "./seed/ideas-it";
import { GENERAL_IDEAS } from "./seed/ideas-general";
import { EXPANSION_IDEAS } from "./seed/ideas-expansion";
import { SOLUTIONS_A } from "./seed/solutions-a";
import { SOLUTIONS_B } from "./seed/solutions-b";
import { SOLUTIONS_C } from "./seed/solutions-c";

const IDEAS: IdeaSeed[] = [
  ...FINANCE_AP_IDEAS,
  ...FINANCE_OTHER_IDEAS,
  ...HR_ONBOARDING_IDEAS,
  ...HR_OTHER_IDEAS,
  ...PROCUREMENT_IDEAS,
  ...FACILITIES_IDEAS,
  ...IT_IDEAS,
  ...GENERAL_IDEAS,
  ...EXPANSION_IDEAS,
];
const SOLUTIONS: SolutionSeed[] = [...SOLUTIONS_A, ...SOLUTIONS_B, ...SOLUTIONS_C];

// Deterministic RNG (mulberry32). Same seed => same dataset every run.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const randInt = (min: number, max: number): number => min + Math.floor(rand() * (max - min + 1));

const DAY = 86_400_000;
const iso = (t: number): string => new Date(t).toISOString().slice(0, 10);

function randomDateBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return from + Math.floor(rand() * (to - from));
}

// ---------------------------------------------------------------------------
// Users — 6 orgs x (director, 2 leads, 4 staff) = 42, coherent manager chain.
// Grew from 35 with the General Business Process service (v4.9).
// ---------------------------------------------------------------------------

const NAMES = [
  "Jordan Avery", "Morgan Blake", "Casey Nguyen", "Riley Patel", "Avery Kim",
  "Quinn Foster", "Harper Silva", "Reese Donovan", "Parker Ellis", "Sage Whitman",
  "Devon Marsh", "Elliott Crane", "Rowan Delgado", "Emerson Cole", "Finley Ortega",
  "Blair Hutchins", "Kendall Frost", "Alexis Romero", "Drew Lancaster", "Jamie Fields",
  "Taylor Brooks", "Skyler Warren", "Cameron Vale", "Peyton Shin", "Addison Moss",
  "Logan Mercer", "Marlow Grant", "Tatum Reyes", "Bailey Chen", "Hayden Locke",
  "Wren Calloway", "Grayson Pike", "Sloane Vincent", "Emerson Vaughn", "Micah Torres",
  "Arden Beck", "Noor Haddad", "Teagan Ruiz", "Indigo Park", "Sutton Bailey",
  "Marin Okafor", "Ellis Nakamura",
];

interface SeedUser {
  id: string;
  name: string;
  org: string;
  service: string;
  manager_id: string | null;
  /**
   * Synthetic contact address. Derived from the name so it is stable across
   * regenerations and obviously fake: `gbs.example` is a reserved TLD that
   * cannot resolve, which keeps the no-real-data rule intact while letting the
   * UI ship real mailto affordances.
   */
  email: string;
}

function buildUsers(): SeedUser[] {
  const users: SeedUser[] = [];
  let n = 0;
  const emailFor = (name: string): string =>
    `${name.toLowerCase().replace(/[^a-z\s]/g, "").trim().replace(/\s+/g, ".")}@gbs.example`;
  for (const [org, services] of Object.entries(ORGS)) {
    const nextId = (): string => `synthetic-user-${String(++n).padStart(3, "0")}`;
    const director: SeedUser = { id: nextId(), name: NAMES[n - 1], org, service: services[0], manager_id: null, email: emailFor(NAMES[n - 1]) };
    const lead1: SeedUser = { id: nextId(), name: NAMES[n - 1], org, service: services[0], manager_id: director.id, email: emailFor(NAMES[n - 1]) };
    const lead2: SeedUser = { id: nextId(), name: NAMES[n - 1], org, service: services[1], manager_id: director.id, email: emailFor(NAMES[n - 1]) };
    const staff: SeedUser[] = [];
    for (let i = 0; i < 4; i++) {
      staff.push({
        id: nextId(),
        name: NAMES[n - 1],
        org,
        service: services[i % services.length],
        manager_id: i % 2 === 0 ? lead1.id : lead2.id,
        email: emailFor(NAMES[n - 1]),
      });
    }
    users.push(director, lead1, lead2, ...staff);
  }
  return users;
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

const users = buildUsers();
const usersByOrg = new Map<string, SeedUser[]>();
for (const u of users) {
  const list = usersByOrg.get(u.org) ?? [];
  list.push(u);
  usersByOrg.set(u.org, list);
}

/** Submitters and builders: any non-director in the org. */
const contributorsOf = (org: string): SeedUser[] =>
  (usersByOrg.get(org) ?? []).filter((u) => u.manager_id !== null);

const BUILT_DATE_CEILING = "2026-08-20";
const REVIEW_DATE_CEILING = "2026-08-25";

const seedIdeas = IDEAS.map((spec, i) => {
  const id = `idea-${String(i + 1).padStart(4, "0")}`;
  const pool = contributorsOf(spec.org);
  const submitter = pick(pool);
  // Solved ideas submit early enough to have been plausibly built.
  const submitted =
    spec.status === "solved"
      ? randomDateBetween("2025-02-01", "2026-03-31")
      : randomDateBetween("2025-02-01", "2026-06-30");
  const built =
    spec.status === "solved"
      ? iso(Math.min(submitted + randInt(25, 140) * DAY, new Date(BUILT_DATE_CEILING).getTime()))
      : null;
  return {
    key: spec.key,
    id,
    doc_type: "idea" as const,
    org: spec.org,
    service: spec.service,
    title: spec.title,
    description: spec.description,
    notes: spec.notes,
    submitted_by: submitter.id,
    submitted_by_manager: submitter.manager_id as string,
    submitted_date: iso(submitted),
    status: spec.status,
    linked_solution_id: null as string | null,
    duplicate_of: null as string | null,
    // Annotations for the enrichment + verification scripts (stripped from app datasets).
    _cluster: spec.cluster ?? null,
    _duplicate_of_key: spec.duplicateOfKey ?? null,
    _vague: spec.vague ?? false,
    _built_date: built,
  };
});

const ideaIdByKey = new Map(seedIdeas.map((i) => [i.key, i.id]));

const seedSolutions = SOLUTIONS.map((spec, i) => {
  const id = `sol-${String(i + 1).padStart(4, "0")}`;
  const resolvedIdea = spec.resolvesKey
    ? seedIdeas.find((idea) => idea.key === spec.resolvesKey)
    : undefined;
  const org = resolvedIdea?.org ?? pick([...usersByOrg.keys()]);
  const pool = contributorsOf(org);
  const builder = pick(pool);
  const owner = spec.ownerDiffers ? pick(pool.filter((u) => u.id !== builder.id)) : builder;
  const dateBuilt =
    resolvedIdea?._built_date ?? iso(randomDateBetween("2025-06-01", "2026-07-15"));
  const reviewed = spec.neverReviewed
    ? null
    : iso(
        Math.min(
          new Date(dateBuilt).getTime() + randInt(10, 110) * DAY,
          new Date(REVIEW_DATE_CEILING).getTime()
        )
      );
  return {
    key: spec.key,
    id,
    doc_type: "solution" as const,
    resolves_idea_id: resolvedIdea?.id ?? null,
    name: spec.name,
    artifact_type: spec.artifactType,
    technology_type: spec.technologyType,
    raw_description: spec.rawDescription,
    ai_generated_summary: null as string | null,
    category_tags: [] as string[],
    artifact_link: `https://sharepoint.example/artifacts/${id}`,
    solution_owner: owner.id,
    built_by: builder.id,
    date_built: dateBuilt,
    date_last_reviewed: reviewed,
    duplicate_of: null as string | null,
    duplicate_candidates: [] as Array<{ id: string; score: number }>,
    _cluster: spec.cluster ?? null,
    _duplicate_of_key: spec.duplicateOfKey ?? null,
    _orphan: spec.orphan ?? false,
  };
});

// Wire confirmed duplicate links (human-validated, pre-existing).
for (const idea of seedIdeas) {
  if (idea._duplicate_of_key) idea.duplicate_of = ideaIdByKey.get(idea._duplicate_of_key) ?? null;
}
const solutionIdByKey = new Map(seedSolutions.map((s) => [s.key, s.id]));
for (const sol of seedSolutions) {
  if (sol._duplicate_of_key) sol.duplicate_of = solutionIdByKey.get(sol._duplicate_of_key) ?? null;
}
// Point linked ideas at their solutions (the Layer 1 capture link).
for (const sol of seedSolutions) {
  if (sol.resolves_idea_id) {
    const idea = seedIdeas.find((i) => i.id === sol.resolves_idea_id);
    if (idea) idea.linked_solution_id = sol.id;
  }
}

// ---------------------------------------------------------------------------
// Write files
// ---------------------------------------------------------------------------

const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

fs.writeFileSync(path.join(dataDir, "users.json"), JSON.stringify(users, null, 2) + "\n");

fs.writeFileSync(
  path.join(dataDir, "seed-records.json"),
  JSON.stringify(
    { generated_at: new Date().toISOString(), ideas: seedIdeas, solutions: seedSolutions },
    null,
    2
  ) + "\n"
);

const linkedIdeas = seedIdeas.filter((i) => i.linked_solution_id).length;
const plantedIdeaClusters = new Set(seedIdeas.map((i) => i._cluster).filter(Boolean));
const plantedSolClusters = new Set(seedSolutions.map((s) => s._cluster).filter(Boolean));
console.log(
  `Seed written: ${users.length} users, ${seedIdeas.length} ideas (${linkedIdeas} linked), ${seedSolutions.length} solutions.`
);
console.log(
  `Planted duplicate clusters: ${plantedIdeaClusters.size} idea, ${plantedSolClusters.size} solution.`
);
console.log(
  `Confirmed duplicate_of links: ideas ${seedIdeas.filter((i) => i.duplicate_of).length}, solutions ${seedSolutions.filter((s) => s.duplicate_of).length}.`
);





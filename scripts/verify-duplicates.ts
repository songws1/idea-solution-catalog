/**
 * Duplicate-threshold verification harness.
 *
 * Checks, for each dataset variant:
 *   1. Every planted near-duplicate cluster (ground-truth annotations in
 *      data/seed-records.json) is caught — all its members land in one
 *      detected duplicate cluster.
 *   2. No false positives — every detected cluster corresponds to a planted
 *      cluster.
 *
 * Run: npm run verify-duplicates
 * Exit code 0 = pass. Non-zero = tune DUP_THRESHOLD and re-run npm run enrich.
 */
import fs from "node:fs";
import path from "node:path";

interface Flagged {
  id: string;
  title?: string;
  name?: string;
  duplicate_candidates: Array<{ id: string; score: number }>;
  duplicate_of: string | null;
  embedding: number[];
}

function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

/** Union-find restricted to chosen edge types. */
function components<T extends Flagged>(
  records: T[],
  opts: { candidates: boolean; confirmed: boolean }
): Map<string, T[]> {
  const byId = new Map(records.map((r) => [r.id, r]));
  const parent = new Map(records.map((r) => [r.id, r.id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root) as string;
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const r of records) {
    if (opts.candidates) {
      for (const c of r.duplicate_candidates) if (byId.has(c.id)) union(r.id, c.id);
    }
    if (opts.confirmed && r.duplicate_of && byId.has(r.duplicate_of)) union(r.id, r.duplicate_of);
  }
  const groups = new Map<string, T[]>();
  for (const r of records) {
    const root = find(r.id);
    const list = groups.get(root) ?? [];
    list.push(r);
    groups.set(root, list);
  }
  return groups;
}

/** Top same-type pair similarities that do NOT belong to a shared planted cluster — the tuning signal. */
function topNonPlantedSims(
  records: Flagged[],
  plantedKeys: Map<string, string>,
  count: number
): Array<{ a: string; b: string; sim: number }> {
  const out: Array<{ a: string; b: string; sim: number }> = [];
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const ca = plantedKeys.get(records[i].id);
      const cb = plantedKeys.get(records[j].id);
      if (ca && ca === cb) continue; // planted pair
      out.push({
        a: records[i].id,
        b: records[j].id,
        sim: cosine(records[i].embedding, records[j].embedding),
      });
    }
  }
  out.sort((x, y) => y.sim - x.sim);
  return out.slice(0, count);
}

// PART2_MARKER


interface SeedRec {
  key: string;
  id: string;
  title?: string;
  name?: string;
  _cluster: string | null;
}

interface Dataset {
  variant: string;
  duplicate_threshold: number;
  ideas: Flagged[];
  solutions: Flagged[];
}

function label(r: Flagged): string {
  return r.title ?? r.name ?? r.id;
}

function checkVariant(
  ds: Dataset,
  plantedByType: { idea: Map<string, SeedRec[]>; solution: Map<string, SeedRec[]> },
  plantedKeys: Map<string, string>
): { missed: string[]; falsePositives: string[][] } {
  const missed: string[] = [];
  const falsePositives: string[][] = [];

  const check = (docType: "idea" | "solution") => {
    const records = docType === "idea" ? ds.ideas : ds.solutions;
    const planted = plantedByType[docType];

    // Catch check: planted members must be connected via detected candidates ONLY
    // (the confirmed duplicate_of edge is prior knowledge, not detection).
    const detectedGroups = components(records, { candidates: true, confirmed: false });
    for (const group of detectedGroups.values()) {
      if (group.length < 2) continue;
      for (const [cluster, members] of planted) {
        const memberIds = members.map((m) => m.id);
        const allIn = memberIds.every((id) => group.some((r) => r.id === id));
        if (allIn) planted.delete(cluster);
      }
    }
    for (const [cluster, members] of planted) {
      const detail = members
        .map((m) => {
          const self = records.find((r) => r.id === m.id);
          const best = members
            .filter((o) => o.id !== m.id)
            .map((o) => {
              const other = records.find((r) => r.id === o.id);
              return cosine(self?.embedding ?? [], other?.embedding ?? []);
            });
          return `${m.id} (max in-cluster sim: ${Math.max(0, ...best).toFixed(4)})`;
        })
        .join("; ");
      missed.push(`${docType} cluster "${cluster}": ${detail}`);
    }

    // False positives: groups (candidates + confirmed edges) containing records
    // that don't all belong to a single planted cluster.
    const mergedGroups = components(records, { candidates: true, confirmed: true });
    for (const group of mergedGroups.values()) {
      if (group.length < 2) continue;
      const clusterNames = new Set(
        group.map((r) => plantedKeys.get(r.id)).filter((c): c is string => Boolean(c))
      );
      const allPlanted = group.every((r) => plantedKeys.has(r.id));
      if (!(allPlanted && clusterNames.size === 1)) {
        falsePositives.push(
          group.map((r) => `${r.id} "${label(r)}"`)
        );
      }
    }
  };

  check("idea");
  check("solution");
  return { missed, falsePositives };
}

function memberIdsSameCluster(members: SeedRec[], id: string): boolean {
  return members.some((m) => m.id === id);
}
void memberIdsSameCluster;

// PART3_MARKER


function main(): void {
  const dataDir = path.join(process.cwd(), "data");
  const seed = JSON.parse(fs.readFileSync(path.join(dataDir, "seed-records.json"), "utf8")) as {
    ideas: SeedRec[];
    solutions: SeedRec[];
  };

  const plantedKeys = new Map<string, string>();
  const plantedByType = {
    idea: new Map<string, SeedRec[]>(),
    solution: new Map<string, SeedRec[]>(),
  };
  const collect = (records: SeedRec[], docType: "idea" | "solution") => {
    for (const r of records) {
      if (!r._cluster) continue;
      plantedKeys.set(r.id, r._cluster);
      const list = plantedByType[docType].get(r._cluster) ?? [];
      list.push(r);
      plantedByType[docType].set(r._cluster, list);
    }
  };
  collect(seed.ideas, "idea");
  collect(seed.solutions, "solution");

  const totalPlanted =
    plantedByType.idea.size + plantedByType.solution.size;

  let failed = false;
  for (const file of ["dataset-pre-enrichment.json", "dataset-post-enrichment.json"]) {
    const ds = JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8")) as Dataset;
    console.log(`\n=== ${file} (threshold ${ds.duplicate_threshold}) ===`);
    // Fresh copies of planted maps per variant (check mutates them).
    const plantedCopy = {
      idea: new Map([...plantedByType.idea].map(([k, v]) => [k, v.map((m) => ({ ...m }))])),
      solution: new Map([...plantedByType.solution].map(([k, v]) => [k, v.map((m) => ({ ...m }))])),
    };
    const { missed, falsePositives } = checkVariant(ds, plantedCopy, plantedKeys);
    console.log(
      `Planted clusters: ${totalPlanted}. Missed: ${missed.length}. Detected groups not matching a planted cluster: ${falsePositives.length}.`
    );
    // Always report planted-cluster similarity ranges (from the stored embeddings).
    for (const docType of ["idea", "solution"] as const) {
      const records = docType === "idea" ? ds.ideas : ds.solutions;
      const plantedFresh = new Map(
        [...plantedByType[docType]].map(([k, v]) => [k, v.map((m) => ({ ...m }))])
      );
      for (const [cluster, members] of plantedFresh) {
        const sims: number[] = [];
        for (const m of members) {
          const self = records.find((r) => r.id === m.id);
          for (const o of members) {
            if (o.id === m.id) continue;
            const other = records.find((r) => r.id === o.id);
            sims.push(cosine(self?.embedding ?? [], other?.embedding ?? []));
          }
        }
        console.log(
          `  planted ${docType} "${cluster}": in-cluster sim range ${Math.min(...sims).toFixed(4)} - ${Math.max(...sims).toFixed(4)}`
        );
      }
    }
    // Tuning signal: highest same-type pair sims outside planted clusters.
    for (const docType of ["idea", "solution"] as const) {
      const records = docType === "idea" ? ds.ideas : ds.solutions;
      const top = topNonPlantedSims(records, plantedKeys, 5);
      console.log(
        `  Top non-planted ${docType} sims: ${top.map((t) => `${t.a}~${t.b}=${t.sim.toFixed(4)}`).join(", ")}`
      );
    }
    for (const m of missed) {
      failed = true;
      console.log(`  MISS  ${m}`);
    }
    for (const fp of falsePositives) {
      failed = true;
      console.log(`  FALSE-POSITIVE  ${fp.join("  |  ")}`);
    }
    if (!missed.length && !falsePositives.length) {
      console.log("  PASS: every planted cluster caught, no unrelated records flagged.");
    }
  }

  console.log(failed ? "\nRESULT: FAIL — tune DUP_THRESHOLD, re-run enrich." : "\nRESULT: PASS");
  process.exit(failed ? 1 : 0);
}

main();


import datasetPreJson from "@/data/dataset-pre-enrichment.json";
import datasetPostJson from "@/data/dataset-post-enrichment.json";
import usersJson from "@/data/users.json";
import type {
  CatalogRecord,
  Dataset,
  DatasetVariant,
  IdeaRecord,
  SolutionRecord,
  UserRecord,
} from "./types";

// Both datasets are committed JSON; static imports let the bundler include
// them in the serverless build. No runtime database, no disk access.
const DATASETS: Record<DatasetVariant, Dataset> = {
  pre: datasetPreJson as unknown as Dataset,
  post: datasetPostJson as unknown as Dataset,
};

export function getDatasetVariant(): DatasetVariant {
  const raw = (process.env.DATASET_VARIANT ?? "post").trim().toLowerCase();
  return raw === "pre" ? "pre" : "post";
}

export function loadDataset(variant: DatasetVariant = getDatasetVariant()): Dataset {
  return DATASETS[variant];
}

export function loadAllRecords(variant: DatasetVariant = getDatasetVariant()): CatalogRecord[] {
  const ds = loadDataset(variant);
  return [...ds.ideas, ...ds.solutions];
}

export function getUsers(): UserRecord[] {
  return usersJson as unknown as UserRecord[];
}

const USER_BY_ID = new Map<string, UserRecord>(getUsers().map((u) => [u.id, u]));

export function userById(id: string | null | undefined): UserRecord | undefined {
  if (!id) return undefined;
  return USER_BY_ID.get(id);
}

/** Resolve a user id to a display name, falling back to the raw id. */
export function userName(id: string | null | undefined): string {
  return USER_BY_ID.get(id ?? "")?.name ?? id ?? "unknown";
}

export function findIdea(dataset: Dataset, id: string): IdeaRecord | undefined {
  return dataset.ideas.find((i) => i.id === id);
}

export function findSolution(dataset: Dataset, id: string): SolutionRecord | undefined {
  return dataset.solutions.find((s) => s.id === id);
}

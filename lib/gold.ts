import { createHash } from "node:crypto";
import type { OverlapVerdict } from "./overlap";
import type { Dataset } from "./types";

/**
 * The gold query set: shared types and the staleness guard (v4.17).
 *
 * Why this file exists at all. Every other offline check in this repo uses a
 * record's own vector as the query — check-overlap, check-scale, check-fixture
 * all do. That measures whether a record can find itself, which it always can,
 * and says nothing about whether a sentence a person types finds the right
 * record. The gold set is 35 questions written by hand, graded for realism by
 * Chris without sight of an expected answer, with expectations decided by
 * reading what the catalog actually holds. It is the only test here that asks
 * the question the product is for.
 *
 * Because the questions were written against one corpus, they expire when that
 * corpus changes: an idea that moves from open to solved turns a correct
 * "already asked" into a wrong one, and a new solution can make a correct
 * "nothing like this exists" false. Nobody remembers that months later. So the
 * file records a fingerprint of the corpus it was written against, and
 * check-gold refuses to score against a corpus that no longer matches. The
 * reminder fires at the moment it matters, which is the same trick
 * verify-duplicates uses for the duplicate threshold.
 */

export interface GoldExpectation {
  verdict: OverlapVerdict;
  /** Records the answer must surface. Empty for `clear`, where surfacing anything is the failure. */
  records: string[];
  /** True where the right answer also says "built twice" / "asked twice". Absence is not asserted. */
  twice?: boolean;
}

export interface GoldQuery {
  id: string;
  source_batch: number;
  text: string;
  expect: GoldExpectation;
  note?: string;
  /** Where Chris reads the catalog differently from the code, kept as evidence rather than relabelled. */
  disagreement?: string;
  /** Chris's realism grade: would someone actually type this? A, B or C. */
  grade: string;
  /** Filled by scripts/embed-gold.ts, so every later run is offline and free. */
  embedding: number[] | null;
}

export interface GoldFile {
  version: number;
  purpose: string;
  how_expectations_were_set: string;
  written_against: {
    dataset_variant: string;
    records: number;
    generated_at: string;
    fingerprint: string;
    fingerprint_of: string;
  };
  embedding_model: string | null;
  vectors_written_at: string | null;
  balance: Record<string, number>;
  queries: GoldQuery[];
}

export interface GoldBaseline {
  saved_at: string;
  embedding_model: string;
  fingerprint: string;
  verdicts_correct: number;
  n: number;
  /** Per query: was the verdict right, and how much of the expected record set was surfaced. */
  per_query: Record<string, { verdict: boolean; recall: number }>;
}

/**
 * A fingerprint of everything about the corpus that could invalidate a human
 * expectation.
 *
 * Included, and why:
 *   - every record's id, so an addition or removal shows up;
 *   - the text a reader would judge the answer by, so a rewrite shows up;
 *   - each idea's status and linked solution, because "already asked" and
 *     "exists" are the same question asked of an idea before and after it was
 *     built — a status change silently flips the right answer.
 *
 * Deliberately excluded: embeddings, duplicate candidates, dates, owners.
 * Those move for reasons that do not change what a correct answer is, and a
 * guard that fires on noise is a guard people learn to skip.
 */
export function datasetFingerprint(dataset: Dataset): string {
  const h = createHash("sha256");
  h.update(dataset.variant);
  const ideas = [...dataset.ideas].sort((a, b) => a.id.localeCompare(b.id));
  const solutions = [...dataset.solutions].sort((a, b) => a.id.localeCompare(b.id));
  for (const i of ideas) {
    h.update(
      ["idea", i.id, i.title, i.description, i.notes, i.status, i.linked_solution_id ?? ""].join("\u0000")
    );
  }
  for (const s of solutions) {
    h.update(
      ["solution", s.id, s.name, s.raw_description, s.ai_generated_summary ?? "", s.resolves_idea_id ?? ""].join(
        "\u0000"
      )
    );
  }
  return h.digest("hex").slice(0, 16);
}

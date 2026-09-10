/**
 * Build real /api/check payloads offline, with no API key and no spend, so the
 * checked states of the page can be inspected and screenshotted.
 *
 * The route needs a key to embed typed text, but everything downstream of the
 * embedding does not: the dataset already carries vectors. So this uses a
 * record's own embedding as the query for the "exists" case, and dilutes one
 * toward deterministic noise until it lands in the "Related" band for the
 * other. Point a browser at the app with /api/check stubbed by one of these
 * files and the page renders exactly as it would in production.
 *
 * Run: npx tsx scripts/check-fixture.ts exists.json related.json
 */
import { loadDataset } from "../lib/dataset";
import { toClientRecord } from "../lib/client-records";
import { retrieve } from "../lib/retrieval";
import { assessOverlap } from "../lib/overlap";
import type { ClientScoredResult } from "../lib/types";
import { writeFileSync } from "node:fs";

const dataset = loadDataset("post");

function payload(embedding: number[], description: string, explanation: string) {
  const outcome = retrieve(dataset, embedding, { topDirect: 8 });
  const ideas: ClientScoredResult[] = outcome.ideas.map((r) => ({
    ...r,
    record: toClientRecord(r.record),
  }));
  const solutions: ClientScoredResult[] = outcome.solutions.map((r) => ({
    ...r,
    record: toClientRecord(r.record),
  }));
  const result = assessOverlap(ideas, solutions);
  return { description, result, explanation, ideas, solutions };
}

/** Deterministic pseudo-random unit vector, so the fixture is reproducible. */
function noise(dim: number, seed: number): number[] {
  let x = seed;
  const out = Array.from({ length: dim }, () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296 - 0.5;
  });
  const norm = Math.hypot(...out);
  return out.map((v) => v / norm);
}

/** Pull `a` toward noise until its own cosine lands in the "Related" band. */
function dilute(a: number[], w: number, seed: number): number[] {
  const n = noise(a.length, seed);
  const out = a.map((v, i) => v * w + n[i] * (1 - w));
  const norm = Math.hypot(...out);
  return out.map((v) => v / norm);
}

/**
 * Deliberately a solution nobody has ever reviewed, so the fixture exercises
 * the v4.8 caution as well as the verdict. An "it already exists" answer
 * resting on an unvouched-for build is the case worth being able to look at.
 */
const neverReviewed =
  dataset.solutions.find((s) => s.duplicate_candidates.length > 0 && !s.date_last_reviewed) ??
  dataset.solutions.find((s) => s.duplicate_candidates.length > 0) ??
  dataset.solutions[0];
const exists = payload(
  neverReviewed.embedding,
  "Something that reads the AP shared mailbox every morning, sorts what came in, and tells the team what to do with each message.",
  `"${neverReviewed.name}" already triages that mailbox and suggests a next action per message, which is what you described. It does not do anything downstream of the sorting, so if the handling itself is the part you care about there is work left.`
);
writeFileSync(process.argv[2], JSON.stringify(exists));

const related = payload(
  dilute(dataset.solutions[1].embedding, 0.32, 7),
  "I want to pull the text out of scanned invoices so the numbers can be read by something other than a person.",
  "There is no direct overlap. The closest records act on invoices once their contents are already known, or handle the mail around them, rather than doing the extraction itself."
);
writeFileSync(process.argv[3], JSON.stringify(related));

/**
 * A `clear` verdict, and specifically the near-miss flavour: diluted far enough
 * that nothing qualifies, but not so far that the nearest record is noise. That
 * is the case v4.10's split copy exists for, and the harder of the two to
 * produce by hand.
 */
const nearMiss = payload(
  dilute(dataset.solutions[3].embedding, 0.22, 11),
  "A way of keeping the office plants alive when people are away over the summer.",
  ""
);
writeFileSync(process.argv[4] ?? "clear.json", JSON.stringify(nearMiss));

console.log("exists:", exists.result.verdict, "top", exists.result.topScore.toFixed(3));
console.log("related:", related.result.verdict, "top", related.result.topScore.toFixed(3));
console.log(
  "clear:",
  nearMiss.result.verdict,
  "top",
  nearMiss.result.topScore.toFixed(3),
  "nearest:",
  nearMiss.result.nearest?.name ?? "none"
);

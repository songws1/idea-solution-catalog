/**
 * Embed the gold query set, once, and commit the vectors (v4.17).
 *
 * This is the only script in the gold harness that spends money, and it is
 * meant to be run about as often as `enrich`: when the questions change, or
 * when the embedding model does. Everything after it — scripts/check-gold.ts —
 * runs offline and free, which is what makes the gold set something you can put
 * in a pre-push habit rather than something you remember to do twice a year.
 *
 * 35 short questions through text-embedding-3-small is a fraction of a cent.
 *
 * Two refusals, both deliberate:
 *
 *   1. The dataset fingerprint must still match the one the questions were
 *      written against. Embedding stale questions would produce a file that
 *      looks current and tests nothing; see lib/gold.ts for why the corpus
 *      invalidates the expectations.
 *   2. The vectors must come from the same model the corpus was embedded with.
 *      Cosine similarity across two models is not a smaller number, it is a
 *      meaningless one.
 *
 * Run: OPENROUTER_API_KEY=... npm run embed-gold
 *      npm run embed-gold -- --force   (re-embed questions that already have vectors)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadDataset } from "../lib/dataset";
import { datasetFingerprint, type GoldFile } from "../lib/gold";
import { embedTexts, embeddingModel, getApiKey } from "../lib/openrouter";

const GOLD_PATH = resolve(process.cwd(), "data/gold-queries.json");
const EMBED_ROUND = 6; // same rounding as scripts/enrich.ts, for file size

function roundTo(v: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(v * f) / f;
}

async function main() {
  const force = process.argv.includes("--force");
  const gold = JSON.parse(readFileSync(GOLD_PATH, "utf8")) as GoldFile;
  const dataset = loadDataset(gold.written_against.dataset_variant === "pre" ? "pre" : "post");

  const fingerprint = datasetFingerprint(dataset);
  if (fingerprint !== gold.written_against.fingerprint) {
    console.error(
      [
        "The dataset has changed since these questions were written.",
        `  written against ${gold.written_against.fingerprint}`,
        `  dataset is now  ${fingerprint}`,
        "",
        "Embedding them now would produce a file that looks current and tests",
        "nothing. Re-read the questions against the records the catalog holds",
        "today, fix the expectations that moved, update written_against, then",
        "run this again.",
      ].join("\n")
    );
    process.exit(1);
  }

  const model = embeddingModel();
  if (model !== dataset.embedding_model) {
    console.error(
      `The corpus was embedded with ${dataset.embedding_model}; this run would use ${model}.\n` +
        "Similarity between vectors from two different models is not comparable.\n" +
        "Set OPENROUTER_EMBEDDING_MODEL to match, or re-run `npm run enrich` first."
    );
    process.exit(1);
  }

  if (!getApiKey()) {
    console.error("OPENROUTER_API_KEY is not set. This is the one gold script that needs it.");
    process.exit(1);
  }

  const todo = gold.queries.filter((q) => force || !q.embedding);
  if (todo.length === 0) {
    console.log("Every question already has a vector. Nothing to do (--force to re-embed).");
    return;
  }

  console.log(`Embedding ${todo.length} of ${gold.queries.length} questions with ${model}...`);
  const vectors = await embedTexts(todo.map((q) => q.text));
  todo.forEach((q, i) => {
    q.embedding = vectors[i].map((v) => roundTo(v, EMBED_ROUND));
  });

  const dim = gold.queries.find((q) => q.embedding)?.embedding?.length;
  const corpusDim = dataset.solutions[0].embedding.length;
  if (dim !== corpusDim) {
    console.error(`Vector size ${dim} does not match the corpus (${corpusDim}). Not writing.`);
    process.exit(1);
  }

  gold.embedding_model = model;
  gold.vectors_written_at = new Date().toISOString();
  writeFileSync(GOLD_PATH, `${JSON.stringify(gold, null, 2)}\n`);

  console.log(
    `Wrote ${todo.length} vectors to data/gold-queries.json (${dim} dims). Commit it, then run: npm run check-gold`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

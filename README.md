# GBS Idea + Solution Catalog

A working prototype of an AI-enabled search and governance layer over an
organization's improvement-idea portal and its associated solution artifacts.

**Everything in this repo is synthetic.** Every idea, solution, person, org,
and artifact link was generated for this prototype. No real organizational
data, names, or terminology. "GBS" is a generic org name.

## What this demonstrates

1. **Enrichment improves retrieval.** Built solutions are scanned with an LLM
   and the resulting summary + tags are written back onto the originating
   idea record. The same query run against the two committed datasets
   (`dataset-pre-enrichment.json` vs `dataset-post-enrichment.json`) returns
   visibly better results on the post set, because vague idea records become
   findable in solution-side language. This is the core demo: try a query like
   *"has anything been built to handle invoice disputes?"* against each
   dataset and compare the ideas panel.
2. **Cross-referencing is visible.** Search shows ideas and solutions in two
   linked panels. Selecting a result highlights its counterpart and draws the
   connector line between them; solution cards carry the artifact link so you
   can go get the thing and reuse it.
3. **Duplication is detectable and legible.** Near-duplicate ideas and
   solutions are detected offline via cosine similarity over the search
   embeddings and surfaced as review candidates in the search view and the
   governance dashboard — never auto-merged.

## The two views

- **`/search`** — conversational search (RAG) across ideas and solutions,
  two linked panels, optional synthesized answer above the results.
- **`/governance`** — catalog health for leaders: status by org, aging,
  build throughput, share of records flagged as duplicates, an org-by-org dot
  grid (one dot per record), duplicate cluster listings (with submitter,
  manager, and solution owner), and an estimated-reuse-savings figure that is
  explicitly labeled as an illustrative placeholder.

## Architecture (why there is no database)

Vercel serverless functions are stateless and ephemeral, so nothing is
indexed or written at request time:

- An offline script (`npm run enrich`) computes embeddings for every record
  and writes them into the committed dataset JSON files.
- At query time, `/api/search` embeds **only the user's question** (one LLM
  API call) and does in-memory cosine similarity against the precomputed
  vectors. At this dataset size (~90 records) that needs no vector store at
  all.
- Duplicate detection reuses the same embeddings, offline; the UI reads the
  stored `duplicate_candidates` fields. No live similarity computation.
- All LLM calls are server-side (API route + offline script). The API key
  never reaches the browser.

## Running locally

Requirements: Node 18.17+.

```bash
npm install
npm run dev          # http://localhost:3000
```

Copy `.env.example` to `.env.local` and set:

```
OPENROUTER_API_KEY=sk-or-...        # required for search; never commit it
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small   # optional
OPENROUTER_GENERATION_MODEL=google/gemini-2.5-flash        # optional
DATASET_VARIANT=post                # "pre" or "post" (default post)
```

> **Note:** save `.env.local` as plain UTF-8. A UTF-16 file (PowerShell 5's
> default) will not be parsed by Next.js.

The governance dashboard works without an API key. Search needs one: without
it, the app shows a clear message instead of crashing.

### Switching datasets

There is **no in-product dataset switcher, by design** — the comparison is
demonstrated by running the demo twice, not by a mode toggle inside the
product. The app reads whichever committed dataset `DATASET_VARIANT` names,
from a pre-generated JSON file. Switching variants requires restarting the
dev server (or, on Vercel, changing the env value and redeploying).

## Regenerating the datasets

```bash
npm run seed                 # deterministic synthetic generator (no LLM, no cost)
                             # → data/users.json + data/seed-records.json
npm run enrich               # LLM pipeline (requires OPENROUTER_API_KEY)
                             # → data/dataset-pre-enrichment.json
                             # → data/dataset-post-enrichment.json
npm run verify-duplicates    # checks detection against the planted clusters
```

`enrich` does four things, per the spec's pipeline: (1) summarizes each
solution and generates tags; (2) writes the summary, tags, and artifact link
back onto the linked idea; (3) embeds every idea and solution as its own
chunk — pre-embeddings from the submitter's original wording only,
post-embeddings including the written-back solution language; (4) runs
duplicate detection and writes `duplicate_candidates`. Both dataset files are
produced in one run and committed.

LLM summaries are cached in `.enrich-cache/` (git-ignored) so re-runs don't
re-bill. Delete a record's cache file to regenerate its summary.

**Changing either model env var requires re-running `npm run enrich`
afterwards** — the committed datasets already contain embeddings and
summaries generated with the previous model; the env var alone does not
retroactively update them.

### Duplicate thresholds

Detection uses cosine-similarity clustering over the same embeddings used for
search. The pre- and post-enrichment corpora are embedded from different
text, so their similarity distributions differ, and each dataset records its
own tuned threshold in its metadata:

- `dataset-pre-enrichment.json` — threshold **0.65**
- `dataset-post-enrichment.json` — threshold **0.7118**

These values are also the built-in defaults in `scripts/enrich.ts`, so a
plain `npm run enrich` reproduces the committed tuning; the env vars are only
needed to experiment. The post threshold was re-tuned (previously 0.70) when
summaries/tags were regenerated against the fixed taxonomy (Addendum A §1.3):
the new post text narrowed the margin between the planted
`sol-0011`~`sol-0020` pair (0.7120) and the highest non-planted pair
(`idea-0005`~`idea-0006`, 0.7116). If a future regeneration shifts either
side, `npm run verify-duplicates` will say exactly which pairs moved.

`npm run verify-duplicates` validates both datasets against the planted
ground truth in `data/seed-records.json` (6 planted near-duplicate clusters).
Current result: **every planted cluster is caught and no unrelated records
are flagged in either dataset.** Override with `DUP_THRESHOLD`,
`DUP_THRESHOLD_PRE`, or `DUP_THRESHOLD_POST`.

## Deploying to Vercel

1. Push this repo to GitHub (it contains no secrets; `.env.local` is
   git-ignored).
2. In Vercel, import the repo and set the environment variables above in
   project settings (`OPENROUTER_API_KEY` is the only required one).
3. Deploy. No database, no storage, no runtime filesystem access.

## Project layout

```
app/               Next.js App Router: /search, /governance, /api/search
components/        search view (panels, cards, connector) + governance widgets
lib/               types, dataset loading, retrieval, governance math, OpenRouter client
scripts/           seed generator, enrichment pipeline, duplicate verifier
data/              committed: users, seed records, both datasets (with embeddings)
```

## Future seams (intentionally not built)

The spec leaves clean slots for: security/prompt-injection scanning of
artifacts, a formal evaluation harness for skills against model versions,
and fine-grained access control. None produce data in this prototype, and
none are represented in the UI.



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
   findable in solution-side language. This is the core demo: describe
   *"a way to handle invoice disputes coming into the AP inbox"* against each
   dataset and compare what the check finds.
2. **Cross-referencing is visible.** Ideas and the solutions that resolved
   them sit on one board. A solution card names the idea it resolves and links
   straight to it; the detail drawer names the counterpart in both directions.
   Solution cards carry the artifact link so you can go get the thing and
   reuse it.
3. **Duplication is detectable and legible.** Near-duplicate ideas and
   solutions are detected offline via cosine similarity over the search
   embeddings and surfaced as review candidates on the board and in the
   governance dashboard — never auto-merged.
4. **Staleness is visible before it costs anything.** Internal catalogs die of
   stale entries, not of weak search, and this one stakes its credibility on
   "this already exists, go and get it". So records nobody has confirmed
   recently carry a mark on the board, a sentence in the drawer, and a caution
   inside the verdict itself; the governance dashboard counts them. One scale
   (`lib/freshness.ts`) grades all four, so they cannot contradict each other.

## The three views

- **`/`** — one text input, two parts to the answer, no overlap between them.
  Describe what you are about to build; the catalog says in words whether it
  has already been built, whether someone has already asked for it, or whether
  the way is clear. Below that the board carries the records themselves: one
  Kanban in three lanes (Idea / In progress / Solution), ranked against the
  description, cut to what actually matches, with a match label on every card.
  With nothing asked yet it is the plain catalog, filterable and sortable.

  Two rounds of de-duplication got it there. v4.6 removed a second search box:
  both inputs took free text, embedded it and ranked the same catalog, so
  keeping both meant two identical-looking boxes and two ways to spend credit
  for one question. v4.7 removed the verdict's own card grid, which was the
  board's first tiles drawn a second time with less on them, and cut the board
  to "Strong match" and "Related" so a ranked board holds only things that
  rank. The line above the board says how many were left off.

  The board stays on the page rather than moving behind a click because it
  renders with no API call: if the key is missing or the spend cap is reached,
  the check fails but the page still has the whole catalog on it.
- **`/governance`** — catalog health for leaders: status by service, aging
  against the same thresholds that mark a card, how many solutions nobody has
  confirmed working, build throughput, share of records flagged as duplicates,
  a service-by-service dot grid (one dot per record), and duplicate cluster
  listings with submitter, manager, and solution owner.
- **`/export`** — the catalog as two flat CSV files, one per record type.

Every solution card downloads a real artifact file, generated from the record
at request time (`lib/artifact-file.ts`). The three artifact types produce
different documents — a paste-ready prompt, a skill definition, or an
automation runbook — and each says plainly that it is synthetic and does not
pretend to be runnable code.

## Architecture (why there is no database)

Vercel serverless functions are stateless and ephemeral, so nothing is
indexed or written at request time:

- An offline script (`npm run enrich`) computes embeddings for every record
  and writes them into the committed dataset JSON files.
- At query time, `/api/check` — the only retrieval route — embeds **only the
  user's description** (one LLM API call) and does in-memory cosine similarity
  against the precomputed vectors. At this dataset size (~90 records) that
  needs no vector store at all. It returns the verdict and the full ranked sets
  in one response, so the board below re-ranks with no second call.
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
OPENROUTER_API_KEY=sk-or-...        # required for the check; never commit it
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small   # optional
OPENROUTER_GENERATION_MODEL=google/gemini-2.5-flash        # optional
DATASET_VARIANT=post                # "pre" or "post" (default post)
```

> **Note:** save `.env.local` as plain UTF-8. A UTF-16 file (PowerShell 5's
> default) will not be parsed by Next.js.

The board, the governance dashboard and the CSV export all work without an API
key. Only the check needs one: without it, the check shows a clear message
instead of crashing, and the rest of the page still renders.

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
npm run check-overlap        # verdict logic for the check (no API key, no spend)
npm run check-freshness      # staleness scale + board/dashboard agreement
npm run check-fixture a.json b.json   # real /api/check payloads, offline, for
                                      # inspecting the checked UI with no spend
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

1. Push this repo to GitHub. It contains no secrets: `.env.local` is
   git-ignored and only the placeholder `.env.example` is tracked.
2. In Vercel, **Add New → Project**, import the repo. The framework preset is
   detected as Next.js; the default build command and output settings are
   correct, so nothing needs changing on that screen.
3. Under **Environment Variables**, add `OPENROUTER_API_KEY` with the real
   key. Paste it here and nowhere else — never into a file in the repo, an
   issue, or a chat. Add the optional vars from `.env.example` only if you
   want to override the defaults.
4. Deploy. No database, no storage, no runtime filesystem access.

Fonts are self-hosted through `@fontsource-variable/inter`, so the build does
not depend on Google Fonts being reachable and the running page makes no
third-party font request.

### Keeping the API key from being spent by strangers

The key itself never reaches the browser: it is read only in `lib/openrouter.ts`,
which is imported only by the server-side `/api/check` route, and it carries no
`NEXT_PUBLIC_` prefix, so Next.js will not inline it into a client bundle.

The real exposure on a public deployment is different — the *endpoint* is open
even though the key is hidden, and every call to it spends OpenRouter credit
(one embedding, plus one chat completion when there is overlap to explain).
Two guards ship in the code:

- `/api/check` rate-limits each client to 12 calls per minute
  (`lib/rate-limit.ts`).
- Descriptions longer than 1200 characters are rejected before any paid call.

Both are per-serverless-instance and best-effort. They stop accidental loops
and casual hammering, not a determined distributed abuser.

**The guard that actually bounds the loss is a spend cap on the key itself**,
set in the OpenRouter dashboard. Set one before the first public deploy.

Vercel Deployment Protection is worth knowing the shape of: on the Hobby plan
only Standard Protection is available, and it protects preview deployments and
generated URLs — **not** the production domain, which stays world-readable. On
a paid plan, Password Protection or Vercel Authentication can cover production
too. So on Hobby, the spend cap is the gate and the in-code limits are the
backstop; Deployment Protection is neither.

If a key is ever pasted somewhere public, rotate it in the OpenRouter
dashboard — removing the text afterwards does not un-leak it.

## Project layout

```
app/               Next.js App Router: /, /governance, /export, /api/check
components/        catalog board + cards, record drawer, governance widgets, shell
lib/               types, dataset loading, retrieval, governance math,
                   OpenRouter client, rate limiting
scripts/           seed generator, enrichment pipeline, duplicate verifier
data/              committed: users, seed records, both datasets (with embeddings)
docs/              spec, v3 UX redesign spec, backlog
```

## Future seams (intentionally not built)

The spec leaves clean slots for: security/prompt-injection scanning of
artifacts, a formal evaluation harness for skills against model versions,
and fine-grained access control. None produce data in this prototype, and
none are represented in the UI.



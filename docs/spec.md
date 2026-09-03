# GBS Idea + Solution Search & Governance — Build Brief

**For:** Cline (one-shot build)
**Deploy target:** Vercel (public GitHub repo, synthetic data only)
**Status:** Ready to build. UAT after build, before Vercel deploy.

---

## 1. What This Is

A working prototype demonstrating an AI-enabled search and governance layer
over an organization's improvement-idea portal and its associated
solution artifacts.

Two views, one dataset:

1. **Search view** — conversational (RAG) search across ideas and
   solutions, shown in two linked panels so the idea → solution
   relationship is visible.
2. **Governance dashboard** — reporting view for internal leaders showing
   catalog health: duplicates, status, aging, throughput.

Everything is synthetic. No real organizational data, names, or
terminology. Use "GBS" as the generic org name throughout.

---

## 2. Problem Being Demonstrated

An organization runs an idea-submission portal where team members log
improvement ideas across any lever (continuous improvement, process
improvement, AI, automation). Each submission captures submitter, org,
service supported, idea text, and notes.

Separately, when an idea gets built into an actual solution (an AI skill,
prompt, or automation), that artifact gets saved to a document repository
and tagged with the idea ID it resolves.

Two gaps result:

**Discovery gap.** The two datasets are disconnected at query time. Someone
asking "has this already been solved?" can only search the original idea
text — which is often sparse or vaguely worded — even when a fully-built
solution with a rich description already exists.

**Governance gap.** Without a central catalog, teams build near-duplicate
ideas and near-duplicate solutions independently, solution ownership is
unclear, and leadership has no visibility into how much duplication exists
or how the catalog is trending.

---

## 3. What The Prototype Must Prove

1. **Enrichment improves retrieval.** Scanning a built solution with an LLM
   and writing that enrichment back onto the originating idea record makes
   the idea findable using solution-side language, not just the
   submitter's original wording. Demonstrated by running the same query
   against two datasets (pre-enrichment and post-enrichment) and comparing
   results.
2. **Cross-referencing is visible.** A user searching sees both the idea
   and the solution that resolved it, linked, with an artifact link — not
   two disconnected result lists.
3. **Duplication is detectable and legible to leadership.** Near-duplicate
   ideas and near-duplicate solutions can be surfaced automatically and
   rolled up into a dashboard that makes the scale of duplication visible.

---

## 4. Design Principle: Modularity

Build in layers so features can be added later without rework:

- **Layer 1 — Capture + link:** idea records, solution records,
  cross-reference between them.
- **Layer 2 — Discovery:** unified RAG search, two linked panels.
- **Layer 3 — Health/metadata:** owner, org hierarchy/manager, status,
  duplicate flags. These are *attributes on existing records*, not new
  record types.
- **Layer 4 — Governance reporting:** dashboard widgets driven entirely by
  Layer 3 fields.

**Explicitly out of scope — architect as future slots, do not build:**
security/prompt-injection scanning of artifacts, formal evaluation harness
for testing skills against model versions, fine-grained access control.
Leave clean seams where these would attach.

---

## 5. Data Model

### 5.1 Idea record

```json
{
  "id": "idea-0123",
  "doc_type": "idea",
  "org": "Finance Operations",
  "service": "Accounts Payable",
  "title": "Auto-categorize incoming invoice disputes",
  "description": "Submitter's original idea text, often short/vague.",
  "notes": "Free-text notes field from the portal.",
  "submitted_by": "synthetic-user-042",
  "submitted_by_manager": "synthetic-user-011",
  "submitted_date": "2025-03-11",
  "status": "open | in_progress | solved",
  "linked_solution_id": null,
  "duplicate_of": null,
  "duplicate_candidates": [],

  "has_solution": false,
  "solution_link": null,
  "solution_summary": null,
  "solution_tags": []
}
```

The last four fields are **enrichment fields** — empty in the
pre-enrichment dataset, populated in the post-enrichment dataset.

### 5.2 Solution record

```json
{
  "id": "sol-0087",
  "doc_type": "solution",
  "resolves_idea_id": "idea-0123",
  "name": "Invoice Dispute Classifier Prompt",
  "artifact_type": "prompt | skill | automation",
  "technology_type": "ChatGPT | Claude | AI + RPA | AI + local automation | Local automation | RPA | Process improvement | Other",
  "raw_description": "Whatever the citizen developer wrote when saving it.",
  "ai_generated_summary": "LLM-generated at ingestion: what it does, what problem it solves, how it's used.",
  "category_tags": ["classification", "invoice-processing", "AI-prompt"],
  "artifact_link": "https://sharepoint.example/artifacts/sol-0087",
  "solution_owner": "synthetic-user-091",
  "built_by": "synthetic-user-091",
  "date_built": "2025-06-02",
  "date_last_reviewed": "2025-08-01",
  "duplicate_of": null,
  "duplicate_candidates": []
}
```

Notes:
- `solution_owner` is a **formal, explicitly assigned field** — not
  defaulted to `built_by`. Ownership and authorship can differ, and some
  records should reflect that.
- `date_last_reviewed` drives the aging widget.
- `technology_type` (added per Addendum A §1.3) is the underlying
  tool/platform used to build the solution — distinct from `artifact_type`,
  which describes the kind of artifact. It comes from a small fixed list
  and is a factual structural attribute set at record-creation time (seed
  generation), **not** inferred by the LLM during enrichment.

### 5.3 User / org hierarchy record

Needed to populate `submitted_by_manager` and `solution_owner` with real
referents:

```json
{
  "id": "synthetic-user-042",
  "name": "Generic Name",
  "org": "Finance Operations",
  "service": "Accounts Payable",
  "manager_id": "synthetic-user-011"
}
```

### 5.4 Cross-referencing

- `idea.linked_solution_id` ↔ `solution.resolves_idea_id`
- `duplicate_of` (confirmed, human-validated link) and
  `duplicate_candidates` (soft similarity flags awaiting review) exist on
  **both** ideas and solutions. Duplicate detection runs independently on
  each record type.

---

## 6. The Two Datasets

Generate **two complete dataset files** from the same underlying records:

- **`dataset-pre-enrichment.json`** — ideas with empty enrichment fields;
  solutions present but with `ai_generated_summary` and `category_tags`
  empty; no cross-reference enrichment written back to ideas.
- **`dataset-post-enrichment.json`** — full enrichment applied: solution
  summaries and tags generated, written back onto linked idea records.

Same engine, same UI, pointed at whichever dataset is selected via config
or a simple dataset selector. **Do not build a feature-level "before/after"
toggle UI.** The comparison is demonstrated by running the demo twice
against different data, not by a mode switch inside the product.

---

## 7. Enrichment Pipeline (build-time script)

Run once as an offline script, not at request time:

1. For each solution record, call the LLM with `raw_description` and
   artifact metadata → generate `ai_generated_summary` and
   `category_tags`.
2. For each solution with a `resolves_idea_id`, write back onto that idea:
   `has_solution: true`, `solution_link`, `solution_summary` (copied from
   `ai_generated_summary`), `solution_tags`.
3. Compute embeddings for every idea and every solution as separate
   chunks.
4. Run duplicate detection (see §9) and write `duplicate_candidates` into
   both datasets.
5. Emit the finished dataset JSON with embeddings included.

Output is committed to the repo. No live indexing, no runtime database.

---

## 8. Search View (Layer 2)

- **Unified index, separate chunks:** each idea and each solution is
  embedded as its own retrievable chunk. Do not merge an idea and its
  solution into a single blob — separate chunks are what allow a match on
  solution-side language when the idea text is poor, and vice versa.
- **Retrieval-time join:** when a chunk is retrieved, resolve its
  cross-reference and pull in the paired document so the answer is
  complete.
- **Two linked panels:** ideas on one side, solutions on the other, with a
  visible connector or highlight when a result in one panel is
  cross-referenced to a result in the other. Selecting a result should
  highlight its counterpart.
- Show the artifact link prominently on solution results — the point is
  that a user can go get the thing and reuse it.
- Optionally synthesize a short conversational answer above the panels
  using the retrieved context.

---

## 9. Duplicate Detection (Layer 3)

- **Scope: both ideas and solutions**, detected independently.
- **Mechanism:** cosine similarity clustering over the same embeddings
  already computed for search. No separate model or pipeline.
- **Computed offline** during the enrichment script; results written into
  the dataset as `duplicate_candidates`. The dashboard reads static
  fields — no live computation at request time.
- **Surfaced in the UI** as a simple visual grouping showing, for each
  cluster:
  - Which records are flagged as similar
  - Which org/domain each belongs to
  - For idea duplicates: the submitter and the submitter's manager
  - For solution duplicates: the solution owner
- **Framing:** these are review candidates, not auto-merges. Nothing is
  merged automatically.

---

## 10. Governance Dashboard (Layer 4)

**Audience: internal leaders.** This is a reporting/status view, not a
working tool for operators. Prioritize legibility and at-a-glance scale
over interactivity.

Visual inspiration: a per-org grid of dots, one dot per record, color-coded
by state (e.g., healthy / needs review / duplicate-flagged / unlinked),
making the volume and distribution of problems immediately visible.
Adapt this to the fields below — do not invent states the data can't
support.

**Widgets:**

1. **Status breakdown** — counts of ideas and solutions by status (open, in
   progress, solved), broken out by org/domain.
2. **Aging** — how long records have sat in their current status; for
   solutions, time since `date_last_reviewed`. Surfaces stalled ideas and
   unmaintained solutions.
3. **Build throughput** — ideas → solutions conversion over time: how many
   submitted ideas actually resulted in a built, linked solution.
4. **% flagged duplicate** — share of records with at least one duplicate
   candidate, per org/domain. This is the core waste metric.
5. **Estimated savings from reuse (stretch, best-effort)** — for ideas
   resolvable by an existing solution rather than a net-new build,
   estimate savings. Use a **clearly labeled illustrative placeholder
   formula** with the assumption stated visibly on screen (e.g.,
   "illustrative: assumes X hours per net-new build"). Do not present this
   as a validated figure. If it can't be done cleanly, omit it rather than
   faking precision.

Do not include security status or evaluation scores — the prototype
doesn't produce that data.

---

## 11. Synthetic Data Requirements

Cline generates the complete dataset. Requirements:

- **Volume:** roughly 60–80 idea records, 20–30 solution records, and
  enough users to populate a coherent org hierarchy.
- **Orgs:** 5–6 generic org/service groupings (e.g., "Finance Operations,"
  "Facilities Support," "HR Shared Services," "Procurement Operations").
  Generic names only.
- **Linkage mix:** a portion of ideas linked to solutions; a meaningful
  portion unlinked (unsolved), and some solutions with no linked idea (to
  show the historical/unlinked gap case).
- **Planted near-duplicates:** deliberate near-duplicate clusters in
  **both** ideas and solutions, worded differently enough that keyword
  matching would miss them but semantic similarity catches them. These are
  what make the duplicate detection demo work — without them there's
  nothing to find.
- **Deliberate description-quality variance:** some idea descriptions
  detailed, some one-line and vague. The vague ones linked to well-described
  solutions are what prove the enrichment story.
- **Date spread:** `submitted_date`, `date_built`, and
  `date_last_reviewed` spread across a realistic range so aging and
  throughput widgets show meaningful variation.
- **Ownership variance:** some solutions where `solution_owner` differs
  from `built_by`.
- **Fully synthetic.** No anonymized real data.

---

## 12. Visual Design

**Direction:** calm, editorial, and legible — closer to a well-designed
internal knowledge tool than a marketing site or a generic admin-panel
template. The audience for both views is people at work trying to find
something or assess catalog health quickly, not a landing page trying to
convert anyone.

This should evoke the same *feeling* as Claude.ai's interface — warm,
uncluttered, confident use of whitespace, quiet typography doing most of
the work — without literally reusing Claude's specific palette, wordmark,
or component styling. Treat it as "same design values, different visual
identity," not a reskin.

**Color — 5 named values, warm-neutral base with a single accent:**
- `--bg` `#FAF8F4` — warm off-white background, not stark white
- `--surface` `#FFFFFF` — panel/card surfaces, subtle lift off `--bg`
- `--ink` `#2B2824` — primary text, warm near-black rather than pure black
- `--ink-muted` `#6B6459` — secondary text, metadata, timestamps
- `--accent` `#3D5A80` — one deliberate accent (muted slate blue) used
  sparingly for interactive elements, links, and the "linked" state
  between idea/solution panels. Avoid reaching for a terracotta/orange
  accent — too close to Claude's own accent color to read as distinct.

Duplicate-flag and status colors are functional, not decorative — desaturate
them so they sit quietly against `--bg` rather than shouting:
- `--status-open` `#8A8375` (muted, neutral — nothing is wrong yet)
- `--status-review` `#B8853F` (muted amber — needs attention)
- `--status-duplicate` `#B0503F` (muted brick red — flagged)
- `--status-solved` `#5B7B5E` (muted sage green — resolved)

**Type:**
- One serif for headings and section titles (something with warmth and
  presence, not a display-heavy face — e.g. a text-weight serif like
  Source Serif or Lora), one clean sans for body copy, labels, and data
  (e.g. Inter or IBM Plex Sans). Two families, clearly distinct roles, no
  more.
- Sentence case throughout — no tracked-out all-caps labels, no
  eyebrow text above headings.
- Line length under ~80 characters for body/description text in the
  search panels.

**Layout:**
- **Search view:** two panels side by side (ideas | solutions), generous
  padding, a visible but understated connector (a thin line or subtle
  shared highlight color, not a bold arrow or badge) when a result in one
  panel links to a result in the other.
  ```
  +------------------+------------------+
  |   IDEAS           |   SOLUTIONS      |
  |  [card] ~~~~~~~~~~~~ [card] linked   |
  |  [card]           |  [card]          |
  |  [card] (no link) |                  |
  +------------------+------------------+
  ```
- **Governance dashboard:** widgets in a calm grid, generous gutters, no
  competing shadows. The duplicate-cluster visual and the per-org grid
  should read like a quiet data table with color used functionally (see
  status colors above) — not a busy admin-dashboard kit with mismatched
  card shadows and gradient washes.

**Principles:**
- Let the cross-reference connector between idea and solution be the one
  deliberate, memorable interactive detail — keep everything else
  (cards, buttons, dashboard widgets) quiet and consistent.
- No decorative gradients, no drop shadows beyond a very subtle
  surface-lift, no rounded-corner-on-everything SaaS-card look.
- Avoid generic template tells: no tracked-out caps labels, no
  middle-dot-joined meta strings, no arrow (→) appended to buttons/links.
- Empty states (no search results, no duplicates found) should say
  plainly what's true and, where relevant, what to do next — not a
  generic "no data" message.
- Responsive down to a reasonable tablet width at minimum; visible
  keyboard focus states; respect reduced-motion preferences; motion used
  only for the panel-linking highlight, not decorative entrance
  animations on load.

---

## 13. Technical Architecture (Vercel-deployable)

**Framework:** Next.js (App Router), deployed to Vercel. React frontend +
serverless API routes in one repo.

**Critical constraint:** Vercel serverless functions are stateless and
ephemeral. **Do not use a file-based vector store** (Chroma, sqlite-vec) or
anything that writes to disk at runtime — it won't persist. Architecture
below avoids needing one entirely.

**Embeddings — precomputed at build time:**
- An offline script (§7) computes embeddings for all records and writes
  them into the committed dataset JSON files.
- At query time, a serverless API route embeds **only the user's query**
  (one live LLM API call) and does in-memory cosine similarity against the
  precomputed vectors loaded from JSON.
- At this dataset size (<100 records) this is fast and requires no database
  at all.

**LLM API integration:**
- **OpenRouter** for both embeddings and generation. Model choice
  configurable via environment variable; default to a cheap, fast model.
- **Build time (offline script):** solution summarization, tag generation,
  record embeddings, duplicate clustering.
- **Request time (serverless route):** query embedding, plus optionally a
  synthesized conversational answer from retrieved context.
- All LLM calls happen **server-side only**, inside API routes. The API key
  must never reach the client.

**API key handling:**
- Local dev: `.env.local`, git-ignored.
- Vercel: environment variable set in project settings.
- Repo contains `.env.example` with key names only, no values.
- Never commit a key. This is a public repo.

**Routes:**
- `/` or `/search` — search view (two linked panels)
- `/governance` — governance dashboard
- `/api/search` — serverless: embed query, retrieve, optionally synthesize
- Both views read the same dataset JSON; dataset selection
  (pre/post-enrichment) via env var or a simple selector.

**Repo hygiene:**
- README covering: what this demonstrates, how to run locally, how to
  regenerate the datasets, how to deploy to Vercel, and an explicit note
  that all data is synthetic.
- Enrichment/dataset-generation script committed and documented so the
  datasets can be regenerated.
- Graceful handling of a missing or invalid API key — show a clear message
  rather than crashing.

---

## 14. Acceptance Criteria (for UAT)

The build is ready for review when:

1. Both dataset files exist, are internally consistent, and contain planted
   near-duplicates in ideas and solutions.
2. Search returns relevant results with two linked panels and visible
   cross-referencing between them.
3. Running the same query against the pre- and post-enrichment datasets
   produces visibly different, better results on the post-enrichment set.
4. The governance dashboard renders all widgets with real values derived
   from the dataset, and the duplicate view shows org, submitter, manager,
   and solution owner as specified.
5. The app runs locally and deploys to Vercel without a runtime database.
6. No secrets in the repo.
7. The visual design follows section 12 — warm-neutral palette, restrained
   accent color, calm typography — and doesn't default to a generic
   SaaS-dashboard look (rounded cards with uniform shadows, gradient
   washes, tracked-out caps labels).
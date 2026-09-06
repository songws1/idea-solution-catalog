> **SUPERSEDED IN PART — see `docs/ux-redesign-v3.md`.**
> Sections 1 and 2 of this addendum (landing page, filter bar, Kanban, card detail) are superseded in full by the v3 redesign spec and must not be used to guide new work. Sections 0, 3, 4 and 5 still stand and have already been built. Kept for history.

# Addendum A — UX/Functionality Revision (v2)

**Status:** Ready to build. Supersedes conflicting statements in the base
spec (`docs/SPEC.md`) only where explicitly noted below; everything else in
the base spec — data model, dataset variants, enrichment pipeline,
architecture, "no toggle" rule, synthetic-data rules — stands unchanged.

**Why this addendum exists:** UAT on the v1 build confirmed the retrieval
backend works correctly (see §0). The problems are entirely in the search
and governance UI layers — score legibility, dead-feeling interactions, and
two screens (landing, post-search results) that need real redesign rather
than a patch. This addendum specs that redesign in full so it can be handed
to Cline (or built directly) without re-deriving decisions already made in
this conversation.

**Reference used, and how to use it:** Chris shared a screenshot of an
unrelated internal prompt-library tool as a *pattern* reference only — card-
based boxed layout, category-pill filter bar, expandable detail with clear
actions, task-oriented entry points. It is not a template to visually clone;
this catalog has a different purpose (idea/solution retrieval + governance,
not a prompt library) and should not force that tool's specific visual
identity. Section 12 of the base spec (visual design system) still governs
palette, type, and overall restraint.

---

## 0. Retrieval Diagnosis (closed — do not re-open)

Live-tested on 2026-09-02 against the real post-enrichment dataset via the
running app, using three queries chosen to stress different parts of the
system:

1. **"has anything been built to handle invoice disputes"** — the planted
   vague idea (`idea-0006`) ranked #1 at score 0.68, ahead of ideas that
   literally contain the word "dispute." Its correctly-linked solution
   (`sol-0003`, "Dispute Response Starter Prompts") ranked #2 in the
   solutions panel at 0.58. The synthesized answer correctly named both
   real solutions by name. Cross-org noise correctly fell to the bottom
   (0.30-0.31) and was correctly marked "shown via its linked counterpart"
   rather than presented as a real match.
2. **"tool for turning meeting notes into action items"** — both planted
   duplicate ideas (`idea-0030`, `idea-0055`) and both their solutions
   (`sol-0011`, `sol-0020`) ranked at the very top (0.74, 0.61, 0.69, 0.64).
   Duplicate flags fired correctly on all four.
3. **"vendor risk review reminders"** (control) — used as a sanity check on
   an unenriched, non-planted query; not fully reported but consistent with
   the above.

**Conclusion: retrieval is working correctly. Do not upgrade the embedding
or generation model.** `openai/text-embedding-3-small` +
`google/gemini-2.5-flash` is producing well-ranked, well-explained results
at this corpus size (63 ideas / 25 solutions). The complaint that "search
seems bad" was a symptom of score illegibility (raw cosine floats with no
context — see §3) and dead-feeling result cards (see §4), not of retrieval
quality. Everything below fixes presentation and interaction, not the
retrieval engine in `lib/retrieval.ts` or `lib/openrouter.ts`, which are
unchanged by this addendum.

---

## 1. New Screen: Catalog Landing Page

**Replaces:** the current bare `/search` entry state (empty-state copy only,
no browsing surface). This becomes the new default landing route (`/`).

**Principle — search stays primary.** The natural-language search bar is
the main act of this product and the thing being demonstrated (§3 of the
base spec). Everything on this page is a *secondary* way in for a user who
doesn't have a specific query yet — it must never visually compete with or
outrank the search bar's prominence.

### 1.1 Layout, top to bottom

1. **Search bar** — same component as today's `/search` view, pinned at
   the top, full width, visually dominant (largest single element on the
   page). Placeholder text stays example-driven ("e.g. has anything been
   built to handle invoice disputes?").
2. **Browse-by filter bar** (secondary, directly under the search bar) —
   revised per Chris's direction: this is **not** a separate task-intent
   row distinct from filters (the addendum's original starter proposal is
   dropped). It is one unified filter system, in two tiers:
   - **Primary chips (always visible):** Service, Solution type (artifact
     type: prompt/skill/automation), Technology type, Org. Each is a
     multi-select dropdown/chip, not a modal.
   - **"More filters" (expandable, secondary row or drawer):** Year, Month,
     Taxonomy (category_tags — see the tag-taxonomy fix below), Org
     (duplicated here intentionally per Chris's list — org is common
     enough to also appear as a quick secondary refinement alongside
     date-based filters, e.g. narrowing "Org: Finance Operations" further
     by "Year: 2026").
   Selecting any filter narrows the card grid (§1.2) live; filters do
   **not** run through the LLM — this is client-side/static filtering over
   the already-loaded dataset, consistent with "no runtime database."
3. **Card grid** — the catalog browse surface itself (§1.2).

### 1.2 Card grid — box-based catalog browse

- Cards represent **solutions** primarily (ideas without a solution appear
  in a secondary "open ideas" section below the grid — solutions are what a
  browsing user is actually hunting for: "has this been built").
- Each card: artifact-type chip, name, one-line AI-generated summary
  (truncated), tag pills (from `category_tags` — **must be clickable**, see
  §1.4), owner name, org.
- Grid responds to the filter bar and to search: when a query is active,
  the grid is replaced by ranked results (existing two-panel view, revised
  per §2); when no query is active, the grid shows the full (filtered)
  catalog in card form.
- Empty filter result: state the applied filters plainly and offer to
  clear them — same empty-state principle as base spec §12 ("say plainly
  what's true and what to do next").

### 1.3 Filter implementation notes

- Filters are derived from the loaded dataset at build/request time — no
  new data files needed; `org`, `service` already exist on idea/solution
  records (solutions inherit org via `orgOfSolution` logic already in
  `lib/governance.ts` — reuse that resolution logic for the solution side
  of these filters rather than duplicating it).
- **Taxonomy filter — resolved, build this way (Chris signed off):**
  `category_tags` are freeform strings generated per-solution by the LLM at
  enrichment time (`scripts/enrich.ts`), so there is no controlled
  vocabulary today — the same concept can appear as "invoice-processing" on
  one solution and "invoice management" on another. Fix: update
  `scripts/enrich.ts`'s system prompt to choose from a fixed allowed-tag
  list instead of generating freeform tags, and re-run `npm run enrich` to
  regenerate both dataset files. This is a scoped, visible exception to
  "don't silently change methodology" — call it out explicitly in the PR/
  commit message ("regenerated tags against a fixed taxonomy for filter
  support; embeddings/duplicate-detection methodology unchanged").
- **"Technology type" — resolved, build as a new field (Chris's call).**
  This is a genuine base-spec data model change, not just a prompt tweak —
  documenting it fully here since it touches `docs/SPEC.md` §5.2:
  - New field on `SolutionRecord`: `technology_type: string`. Add to the
    interface in `lib/types.ts` alongside `artifact_type`, and to the base
    spec's §5.2 solution record example.
  - Distinct from `artifact_type` (prompt/skill/automation, which
    describes the *kind* of artifact) — `technology_type` describes the
    underlying tool/platform used to build it (e.g. "Power Automate,"
    "Excel macro," "Python script," "SharePoint workflow," a specific
    GPT/Claude project). Define a small fixed list (5-8 values) covering
    the artifact types already in the seed data, rather than freeform
    text — same filterability reasoning as the taxonomy fix.
  - **Populated at seed-generation time**, not by the LLM at enrichment:
    add `technology_type` to each solution object authored/generated in
    `scripts/generate-seed.ts`, since this is a factual attribute of how
    the solution was actually built, not something to infer or summarize.
    (Contrast with `category_tags`, which legitimately comes from LLM
    enrichment of the raw description — technology type is closer to
    `artifact_type`, a structural fact set at record-creation time.)
  - Requires touching `seed-records.json` (add the field to every existing
    solution) and re-running `npm run enrich` so both dataset files pick it
    up (the enrichment script passes seed data through to the final
    dataset JSON — `technology_type` just needs to survive that pass
    unchanged, no LLM call needed for this field).
  - Add to the client-facing `ClientSolution` type (already a passthrough
    of most `SolutionRecord` fields in `route.ts`'s `toClient()` — no
    special handling needed since it's not sensitive like `embedding` or
    the raw user ids).

### 1.4 Card actions (ties to §4 — no dead clicks)

- Clicking a card opens the same detail treatment used in search results
  (§2.4) — one consistent "card detail" pattern reused across landing grid
  and search results, not two different UIs.
- Clicking a tag pill **filters the grid to that tag** (sets the tag filter
  from §1.3 and scrolls to top). This directly fixes issue #4 from UAT.

---

## 2. Post-Search Results: Kanban View

**Replaces:** the current two-side-by-side-panel layout in
`components/search/ResultsPanels.tsx` / `ResultCard.tsx` as the *default*
results presentation. Per Chris's direction, the existing static panels/
connector-line view is **not** kept as-is — it's replaced by two views:
Kanban (default, this section) and a new Mindmap/graph view (§2.6,
secondary, toggled) that actually improves on what the connector line did
rather than just preserving it. `ResultsPanels.tsx` and `ConnectorLayer.tsx`
are retired; the graph view is a new component, not a restyle of these.

### 2.1 Why Kanban

Chris's ask: show **idea → in progress → solution** as clustered columns so
a user scanning results can immediately see, per matched topic, what's
open, what's being worked, and what's already built — rather than parsing
two parallel lists and mentally re-associating them.

### 2.2 Column model

Three columns, populated from the existing `ScoredResult` outcome
(`outcome.ideas` + `outcome.solutions` from `lib/retrieval.ts` — no backend
change needed, this is a presentation regrouping of data already returned
by `/api/search`):

- **Idea** — ideas with `status: "open"` and no `linked_solution_id`.
- **In progress** — ideas with `status: "in_progress"`.
- **Solution** — solutions (from the solutions panel), plus solved ideas
  that resolve to them. A solved idea and its solution render as **one
  clustered card** in this column (idea framing + solution summary +
  artifact link together), not two separate cards — this directly answers
  "show idea, in progress, solution" as one story per matched topic rather
  than three disconnected lists.

### 2.3 Clustering rule

Group by the existing cross-reference (`linked_solution_id` /
`resolves_idea_id`), same join already computed in `retrieve()`. A card in
the Idea or In Progress column that has a `duplicate_candidates` hit
against something already in the Solution column should carry a visible
"likely already solved" indicator pointing at that solution card (reuse
the `via_link` / duplicate-candidate data already in `ScoredResult` and
`DuplicateBadge` — no new backend field required, just new UI surfacing of
existing fields).

### 2.4 Card detail (applies to both landing grid §1.4 and Kanban cards)

Confirmed shape to build (solution summary + actions):

- Header: name/title, status or artifact-type chip, match-quality label
  (§3, not raw score) when in a search-results context.
- Body: AI-generated summary (solutions) or description +
  enrichment-written-back summary (ideas), tag pills (clickable, §1.4).
- Metadata row: org, service, owner/submitter name, dates.
- **Actions, all real (fixes #5 and #7):**
  - **"Open the artifact"** — existing link, keep, but restyle as a
    primary button rather than inline text link so it reads as an action,
    not incidental copy.
  - **"View linked idea" / "View linked solution"** — jumps to (scrolls +
    highlights) the paired card, wherever it is in the current view. This
    replaces the passive "shown via its linked counterpart" caption with
    something clickable.
  - **Duplicate disclosure** (existing `DuplicateBadge` behavior — it
    already expands on click) — each listed candidate ID becomes a real
    link that jumps to that record's card if present in the current
    results, or opens its detail directly if not. This fixes #7: today the
    candidate list is inert text (`{c.id} — similarity {c.score}`) with no
    way to actually go look at the flagged record.
  - **"Flag as reviewed" / "Not a duplicate"** — out of scope for this
    prototype (no write-back store exists — see base spec §4, explicitly
    no runtime database). Do not build; if Chris wants this, it requires a
    real backend and is a v3 conversation, not this addendum.

### 2.5 Responsive behavior

Three columns collapse to a single scrollable column with section headers
on narrow viewports (reuse the existing 900px breakpoint threshold that
`ConnectorLayer.tsx` used, for consistency, even though that component
itself is retired).

### 2.6 Mindmap / Graph View (secondary, toggled — "Kanban / Map")

**Purpose:** replace the retired panels+connector view with something that
is actually better, not just preserved for its own sake — specifically,
show idea↔solution links *and* duplicate-candidate relationships at the
same time, which the old connector line could never do (it only ever drew
one active pair, on hover/select, and had no way to represent a duplicate
relationship visually at all).

**Scope:** available from the results view (post-search only, not on the
landing grid — the landing grid has no query-relative relationships to
map). A toggle control ("Kanban / Map") switches between §2's Kanban view
and this graph view for the same result set; both read the same
`/api/search` response, no duplicate data fetch.

**Node model:**
- One node per result in the current `ScoredResult[]` (ideas + solutions
  combined, same set the Kanban columns draw from).
- Node shape/color: doc type (idea vs. solution) by shape or icon; match-
  strength label from §3 by color intensity/border weight (reuse the same
  Strong/Related/Loosely-related scale — one shared visual language across
  Kanban, cards, and this view, not a fourth encoding to learn).
- Node label: short title/name, truncated; full detail on click (opens the
  same §2.4 card-detail panel as a side drawer, graph stays visible behind
  it).

**Edge model — this is the feature's actual value-add over the old view:**
- **Solid edge:** confirmed cross-reference (`linked_solution_id` /
  `resolves_idea_id`) — the same relationship the old connector line drew,
  now visible for *every* linked pair in the result set simultaneously,
  not just the hovered/selected one.
- **Dashed edge:** duplicate-candidate relationship
  (`duplicate_candidates`), drawn between any two nodes both present in
  the current result set. This is new — the old view never visualized
  duplicate relationships at all. Edge weight/opacity can reflect
  similarity score.
- Clicking an edge (or hovering) shows the relationship type and score in
  a small tooltip; clicking either endpoint node opens its card detail.

**Layout:** force-directed graph (nodes repel, edges pull connected nodes
together, so idea/solution/duplicate clusters visually separate into their
own neighborhoods without manual positioning). At this result-set size
(typically under ~20 nodes per query, matching the `topDirect: 8` retrieval
cap plus joins) a force-directed layout settles quickly and stays legible —
this does not need to scale to hundreds of nodes. Implementation: a
lightweight force-layout approach (e.g. a small d3-force usage, or an
equivalent minimal library) computed client-side over the already-returned
result set; no new API route, no server-side graph computation.

**Empty/degenerate cases:** a result set with no cross-references or
duplicate edges at all (isolated nodes only) should say so plainly above
the graph ("no linked or duplicate relationships in these results") rather
than rendering a graph that looks broken when it's actually just showing
truthfully that nothing is connected.

**Responsive behavior:** below the same ~900px breakpoint used elsewhere,
default to Kanban and disable/hide the Map toggle rather than attempting a
force-directed graph on a small viewport — this matches the base spec's
"responsive down to a reasonable tablet width" principle without forcing a
degraded graph experience onto a screen too small to lay it out legibly.

**Build note:** this is the single largest net-new UI component in this
addendum — budget it as its own review checkpoint (see §6), separate from
Kanban, so it can be evaluated on its own once built rather than bundled
into the same UAT pass as the rest of the results-view work.

---

## 3. Match Score — Replace Raw Number with Explained Label

**Fixes #6 and materially fixes the "search feels bad" perception (#3).**

Root cause confirmed by live testing (§0): cosine similarity from
`text-embedding-3-small` on short text compresses into a range that does
not map to a 0-1 intuition (a *strong* match showed 0.68, a real but
secondary match showed 0.42, an unrelated cross-link showed 0.30). Shown as
a bare float, this reads as "everything scored low, search must be broken"
even when the ranking is correct.

**Fix — replace the raw score display in `ResultCard.tsx`'s `card-score`
span with a relative, per-result-set label, not a fixed universal
threshold** (fixed thresholds are fragile — a 0.68 top score in one query
and a 0.45 top score in another can both represent "the best match we
found," so the label must be computed relative to the top score actually
returned, not a hardcoded number):

- Compute `topScore` = highest score in the current result set (ideas +
  solutions combined).
- For each result, label relative to `topScore`:
  - `score >= topScore * 0.9` → **"Strong match"**
  - `score >= topScore * 0.65` → **"Related"**
  - below that → **"Loosely related"** (or omit the label entirely below a
    floor — recommend hiding results under a low absolute floor like 0.15
    rather than labeling them, since near-zero cosine similarity is noise,
    not a weak match)
- Keep the raw score available on hover/expand for anyone who wants it
  (small `title` tooltip or a "0.68 similarity" caption under the label),
  but the label is the primary, glanceable signal.
- Add one line of explanatory copy near the search bar or in a small
  info-icon tooltip: *"Matches are ranked by how closely the meaning of
  your question matches each record — not by keyword overlap."* This is
  the single sentence that would have prevented Chris's "is the model too
  weak" question during UAT.

This is a presentation-layer change only — `ResultCard.tsx` and the new
Kanban card component consume the same `ScoredResult[]` already returned by
`/api/search`; no change to `lib/retrieval.ts` or the API response shape.

---

## 4. Dashboard Fixes (Governance page)

All five items below are **fixes to existing, already-correct backend
logic in `lib/governance.ts`** — that file's calculations are sound (spot-
checked against the base spec's widget list in §10). Nothing here changes
governance.ts's exported functions or their return shapes; all changes are
in the corresponding `components/governance/*.tsx` presentation.

### 4.1 Build throughput chart legibility (#9)

Current `ThroughputWidget.tsx` renders bare CSS-height bars with month
labels thinned to fit. Problems: no y-axis reference (a bar's height means
nothing without a scale), and ideas-submitted vs. solutions-built bars are
easy to confuse without close reading of the legend.

Fix:
- Add a lightweight y-axis with 2-3 gridlines and value labels (even just
  0 / mid / max, based on the existing `max` computation already in the
  component).
- Increase visual separation between the two bar series beyond color alone
  — pair color with a distinct fill pattern or explicit paired-bar grouping
  with a small gap between the pair and a larger gap between months, so
  the eye reads "month groups" not "one long bar sequence."
- Move the legend above the chart (read before, not after, scanning) and
  keep it — it's already present and correct, just positioned late.

### 4.2 Org dot-grid legend clarity (#10)

`OrgDotGrid.tsx` already has a legend (`STATE_LABELS` mapped at the
bottom) — the base spec's requirement is met functionally. The UAT
complaint is about **discoverability**: the legend sits below potentially
many rows of dots, so a user reading the grid top-to-bottom hits unexplained
color-coded dots before reaching the key.

Fix: move the legend to sit directly under the widget's intro paragraph,
above the dot rows, so it's read first. Additionally, since dots are only
distinguishable by color+hover-tooltip today, add the state as a
`aria-label`/tooltip-visible abbreviation directly (already present via
`title`) but also consider a compact inline legend chip repeated every N
rows for long org lists, so the key doesn't require scrolling back up.

### 4.3 Reuse-savings framing (#11)

The underlying logic and caveats in `ReuseSavings.tsx` /
`reuseSavings()` are already good — the "illustrative, not validated"
language, the formula breakdown, and the resolvable-ideas table are all
present and correctly labeled per base spec §10.5. The UAT complaint
("doesn't make much sense to me") is a comprehension/framing gap, not a
missing-caveat gap. Fix the framing, not the math:

- Reframe the headline from a bare dollar figure to a sentence-first
  structure: *"If these {count} open ideas were resolved by reusing an
  existing solution instead of being built from scratch, that could save
  roughly {hours} hours (~${amount})."* — lead with the plain-English
  claim, follow with the number, not the reverse.
  the number.
- Make the assumption line *(50 hrs × $50/hr per build — Chris's fixed
  formula, unchanged by this addendum)* visually part of the headline
  figure's immediate context (already close in the current layout — keep,
  but increase contrast/weight slightly so it doesn't read as fine print
  that can be skipped).
- In the table, add a one-word "why" column value (e.g. "flagged
  duplicate") so the connection between the two listed ideas is explicit
  rather than implied by column position.

### 4.4 Duplicate clusters — add real links (#12)

This is the most substantive dashboard fix. `DuplicateClusters.tsx`
already surfaces org, actor name, manager, and idea/solution cross-linkage
per cluster member (base spec §9's requirement is technically met) — but
every piece of information is **inert text**, which is the actual UAT
complaint ("no link to owner, or owner's org, or to artifact... useless
when user gets stuck here"). Fix — make it actionable:

- Each cluster member becomes clickable, opening the same card-detail
  treatment as §2.4 (reuse the component — do not build a third detail
  view) in a slide-over/modal so the user stays on the governance page.
- Add a direct **"Open the artifact"** action inline on solution cluster
  members (currently the artifact link is only reachable by leaving the
  dashboard entirely, going to search, and finding the record again).
- Add owner/submitter as a `mailto:` or at minimum a visually distinct
  "contact" affordance — synthetic emails are fine for the prototype (a
  clear next step is more important here than a live directory
  integration, which is out of scope).
- Cross-link cluster members to each other within the cluster (e.g. "also
  flagged with idea-0007, idea-0008" as clickable chips) so leadership
  reviewing a cluster doesn't have to re-read the member list to
  understand its shape.

---

## 5. New Tab: Read-Only CSV Export

**Fixes #8 — genuinely missing today, confirmed by code review (no export
route or component exists anywhere in `app/` or `components/`).**

- New route: `/export` (added to primary nav alongside Search and
  Governance).
- Read-only: no upload, no write-back — consistent with "no runtime
  database."
- Two downloadable CSVs, generated **client-side** from the already-loaded
  dataset JSON (no new API route needed — `loadDataset()` is already
  available server-side; render the CSV server-side in a route handler
  that streams `text/csv`, simplest approach and keeps the API key/server-
  only LLM logic untouched):
  - `ideas.csv` — flattened `IdeaRecord` fields, `submitted_by`/
    `submitted_by_manager` resolved to display names (reuse `userName()`
    from `lib/dataset.ts`, same resolution already used for the
    `ClientIdea` shape in `app/api/search/route.ts`), duplicate_candidates
    flattened to a count + comma-joined ID list.
  - `solutions.csv` — same treatment for `SolutionRecord`.
- Respect the active `DATASET_VARIANT` — export reflects whichever dataset
  variant the app is currently running against, labeled in the filename
  (e.g. `ideas-post-enrichment.csv`).
- Page copy should state plainly this is a point-in-time export of
  synthetic demo data, not a live feed.

---

## 6. Build Sequencing Recommendation

Not a hard requirement, but suggested order to keep review checkpoints
small:

1. §3 (score labels) + §4 (dashboard fixes) — smallest, most isolated,
   fastest to verify, and resolves the "is search even working" doubt
   immediately.
2. §5 (CSV export) — self-contained, no dependency on the other work.
3. Taxonomy fix (§1.3) — re-run `npm run enrich` against the fixed tag
   list. Do this before building the filter bar so filters have real data
   to filter against from the start.
4. §1 (landing page + filter bar) + §2.1–2.5 (Kanban results) — these share
   the card-detail component (§2.4) so should land together as one block.
5. §2.6 (Mindmap/graph view) — largest net-new component; its own
   checkpoint, built and reviewed after Kanban is stable, not bundled into
   the same pass.

Each block should get its own UAT pass before moving to the next, rather
than reviewing the whole addendum's worth of change at once.

---

## 7. Open Items — All Resolved

All decisions that were open in the previous revision are now settled and
built into the sections above: the filter bar is a unified browse-by system
(§1.1.2, no separate intent-chip row); the taxonomy tag fix is confirmed
and re-runs enrichment against a fixed tag list (§1.3); "technology type"
is a genuine new field on `SolutionRecord`, populated at seed-generation
time, not enrichment (§1.3); and the panels/connector view is retired in
favor of Kanban as default plus a new Mindmap/graph view as a real,
fully-specced secondary feature (§2.6) rather than being preserved as-is.

Nothing remains blocking a build handoff. §6 gives the recommended build
order.

# Cline Build Prompts — Addendum A Rollout

**How to use this:** run each phase as its own Cline session, **Plan mode
first** (same discipline as the original build — review the plan before
Act mode writes anything), then Act mode once the plan looks right. Do a
short UAT pass after each phase before starting the next one — don't queue
all five phases back to back. This mirrors the §6 build-order recommendation
in the addendum.

Before starting Phase 1, tell Cline once, up front (or paste as the first
line of each phase prompt if using separate sessions):

> Read `docs/SPEC.md` (base spec) and `docs/spec-addendum-v2.md` (approved
> addendum) in full before planning. The addendum supersedes the base spec
> only where it explicitly says so — everything else in the base spec
> (data model except where the addendum adds fields, dataset variants, the
> "no before/after toggle" rule, synthetic-data-only rule, no secrets, no
> real org names) still applies and must not be re-litigated.

---

## Phase 1 — Score legibility + dashboard fixes

**Addendum sections:** §3, §4

```
Implement Addendum A §3 and §4 from docs/spec-addendum-v2.md.

§3: Replace the raw cosine-similarity float shown in ResultCard.tsx's
card-score span with a relative match-quality label (Strong match /
Related / Loosely related), computed relative to the top score in the
current result set, per the thresholds in §3. Keep the raw score visible
on hover/expand. Add the one-line explanatory copy near the search bar
that §3 specifies.

§4: Fix the four governance widgets per the addendum's sub-sections:
4.1 build-throughput chart (add a y-axis reference, better visual
separation between the two bar series, move legend above the chart),
4.2 org dot-grid (move the legend above the dot rows), 4.3 reuse-savings
widget (reframe headline to sentence-first per the addendum's example
copy, add a "why" column to the resolvable-ideas table), 4.4 duplicate
clusters (make cluster members clickable to open card detail — for this
phase, before the new shared card-detail component exists from Phase 4,
it's fine to link to the existing search view's record instead; add a
direct "Open the artifact" action on solution cluster members; add
mailto/contact affordance for owner/submitter; cross-link cluster members
to each other as clickable chips).

Do not change lib/retrieval.ts, lib/openrouter.ts, or any scoring logic —
this phase is presentation-only. Do not change lib/governance.ts's
exported function signatures or return shapes — only the components that
consume them.
```

---

## Phase 2 — CSV export

**Addendum section:** §5

```
Implement Addendum A §5 from docs/spec-addendum-v2.md: a new read-only
/export route with two downloadable CSVs (ideas.csv, solutions.csv)
generated server-side from the currently-loaded dataset (respecting
DATASET_VARIANT), with submitted_by/submitted_by_manager/solution_owner/
built_by resolved to display names via the existing userName() helper in
lib/dataset.ts. Filename should include the dataset variant. Add /export
to primary nav alongside Search and Governance. Page copy should state
this is a point-in-time export of synthetic demo data.
```

---

## Phase 3 — Technology type field + taxonomy tag fix

**Addendum section:** §1.3 (both "Taxonomy filter" and "Technology type" sub-bullets)

```
Implement the two data changes specified in Addendum A §1.3 of
docs/spec-addendum-v2.md, in this order:

1. Add `technology_type: string` to SolutionRecord in lib/types.ts, per
   the addendum's spec — this describes the underlying tool/platform
   (e.g. "Power Automate," "Excel macro," "Python script," "SharePoint
   workflow"), distinct from artifact_type. Define a fixed list of 5-8
   values that fit the existing seed solutions. Add the field to every
   solution object in data/seed-records.json (assign a sensible value per
   existing solution based on its raw_description/name) and to
   scripts/generate-seed.ts so future regeneration includes it. Add it to
   the base spec's §5.2 solution record example in docs/SPEC.md so the
   docs stay accurate.

2. Update scripts/enrich.ts's solution-enrichment system prompt so
   category_tags are chosen from a fixed taxonomy list instead of
   generated freeform, per the addendum. Pick a reasonable taxonomy (10-20
   tags) that covers the existing solutions' actual topics.

3. Re-run `npm run enrich` to regenerate both dataset-pre-enrichment.json
   and dataset-post-enrichment.json with technology_type carried through
   and the new fixed-taxonomy tags. Re-run `npm run verify-duplicates`
   afterward to confirm duplicate detection still catches all planted
   clusters — tag/technology changes should not affect embeddings text
   materially, but verify rather than assume.

Add ClientSolution passthrough for technology_type in the toClient()
function in app/api/search/route.ts (it's not sensitive, no special
handling needed).

Report back: the final technology_type value list, the final tag
taxonomy list, and the verify-duplicates result (should still be 6/6
clusters caught, matching the original build report).
```

---

## Phase 4 — Landing page, filter bar, Kanban results

**Addendum sections:** §1, §2.1–2.5

```
Implement Addendum A §1 (catalog landing page) and §2.1-2.5 (Kanban
results view) from docs/spec-addendum-v2.md. This is the largest phase —
plan mode should produce a clear component breakdown before Act mode
starts.

Key points to hold to from the addendum:
- Search bar stays visually dominant; the filter bar is secondary, never
  competing with it (§1's stated principle).
- Filter bar per §1.1 item 2: primary chips are Service, Solution type,
  Technology type (now a real field after Phase 3), Org; "more filters"
  drawer/row has Year, Month, Taxonomy, Org. Client-side filtering only,
  no LLM call.
- Card grid (§1.2) shows solutions primarily; tag pills are clickable and
  filter the grid (§1.4, fixes UAT issue #4).
- Kanban view (§2.1-2.3): three columns (Idea / In progress / Solution),
  clustering rule and duplicate-indicator behavior exactly as specified.
- Build ONE shared card-detail component (§2.4) used by both the landing
  grid and Kanban cards — not two separate detail UIs. All actions listed
  in §2.4 must be real (open artifact as a primary button, jump-to-linked-
  record, clickable duplicate candidates) — this fixes UAT issues #5 and
  #7. Do NOT build "flag as reviewed" — explicitly out of scope per the
  addendum (no write-back store).
- Kanban is the default results view. Retire ResultsPanels.tsx and
  ConnectorLayer.tsx — do not keep them as a toggle option in this phase
  (the replacement toggle option is the Mindmap view, built in Phase 5;
  until then Kanban is the only results view).
- Visual design still follows base spec §12 (palette, type, restraint) —
  the shared screenshot reference Chris provided is a pattern reference
  only (card layout, expandable detail, clear actions), not a visual
  identity to copy.

Stop and ask if anything in the addendum's filter/column logic is
ambiguous against the actual seed data shape rather than guessing.
```

---

## Phase 5 — Mindmap / graph view

**Addendum section:** §2.6

```
Implement Addendum A §2.6 from docs/spec-addendum-v2.md: a secondary
graph view for post-search results, toggled via "Kanban / Map" alongside
the Phase 4 Kanban view, reading the same /api/search response (no new
API route).

Build exactly per the addendum's node/edge/layout spec:
- Nodes: one per result (idea + solution), shape/icon by doc type, color/
  border by match-quality label (reuse the same Strong/Related/Loosely-
  related scale from Phase 1's §3 work — one shared visual language, not
  a new encoding).
- Edges: solid for confirmed cross-reference (linked_solution_id /
  resolves_idea_id), dashed for duplicate_candidates relationships. This
  dashed-edge case is the feature's actual value over the old connector
  line, which never showed duplicate relationships at all — make sure it
  actually renders, it's the point of building this.
- Force-directed layout, client-side, no server compute. Use a small,
  well-established library (e.g. d3-force) rather than hand-rolling
  physics.
- Clicking a node opens the same shared card-detail component from Phase
  4 as a side drawer, graph stays visible behind it.
- Empty/degenerate case: if a result set has no cross-reference or
  duplicate edges at all, say so plainly above the graph rather than
  rendering isolated nodes with no explanation.
- Below the ~900px breakpoint, hide the Map toggle and default to Kanban
  — do not attempt a degraded graph layout on small viewports.

This is net-new, not a restyle of the retired ConnectorLayer.tsx. Treat
it as its own review checkpoint — don't bundle it into the same UAT pass
as Phase 4.
```

# UX Redesign v3 — Catalog, Governance, Export

**Status:** Approved direction, ready to build.
**Supersedes:** `docs/spec-addendum-v2.md` §1 and §2 in full. Everything else
in Addendum A (§0 retrieval diagnosis, §3 score labelling, §4 governance
widget fixes, §5 CSV export) and everything in `docs/spec.md` (data model,
dataset variants, enrichment pipeline, no-toggle rule, synthetic-data rules,
no secrets, no real org names) stands unchanged.

**Read order for a build session:** `docs/spec.md`, then this file. Do not
read Addendum A; where it conflicts with this document, this document wins,
and where it does not conflict it has already been built.

**Origin:** live UX review of the running app on 2026-09-06, after Phase 4.1.
Findings are from walking the built product, not from reasoning about tickets.

---

## 0. The one structural decision

**Kanban is the only layout.** The card grid is retired.

- `/` (Catalog) renders the Kanban board over the full dataset, unfiltered.
- A search filters and ranks that same board, adds a summary above it, and
  adds a match label to each card. It does not swap in a different component.
- There is no grid/board toggle and no second browse surface to learn.

Everything else in this document is downstream of that. The old landing grid
(`CatalogGrid`, `SolutionCard`) is deleted, not kept behind a flag. This also
absorbs what was previously scoped as "Phase 4.8 — Kanban on landing page";
that phase no longer exists as separate work.

---

## 1. Naming: service and sub-service

The data stores `org` (5 values) and `service` (24 values, each nested under
one `org`). The business meaning is a two-level **service** hierarchy:

| Stored field | Business meaning | UI label | Example |
|---|---|---|---|
| `org` | Service line | **Service** | Finance Operations |
| `service` | Sub-service | **Sub-service** | Accounts Payable |

**Do not rename the stored fields.** `org` and `service` stay as they are in
`lib/types.ts`, the seed scripts, `enrich.ts`, `lib/governance.ts`, and the CSV
export. Renaming them touches six files for no user-visible gain and risks
regressions in code that is already verified.

**Do rename every user-facing label**, with no exceptions:

- Filter chips: `Org` becomes `Service`; a new `Sub-service` chip is added.
- Card footers: `Service: <org>; Sub-service: <service>`.
- Governance headings and table columns: `Status by org` becomes
  `Status by service`; the `Org` column header becomes `Service`;
  `Every record, by org` becomes `Every record, by service`;
  `duplicateRateByOrg`'s rendered heading becomes `Duplicate rate by service`.
- Export page copy: "org, service" becomes "service, sub-service".

Add a one-line comment at each stored-field declaration recording the mapping,
so the next person does not re-litigate it:
`/** Service line. Labelled "Service" in the UI; `service` below is "Sub-service". */`

People map to this hierarchy, which matters for the employee directory phase:
owner and manager can be derived from the service mapping rather than
maintained per person.

---

## 2. Global rules (apply on every tab)

### 2.1 Record identifiers

Raw record ids (`idea-0006`, `sol-0003`) are internal keys. They appear in
exactly two places:

1. The detail drawer, in a muted line under the title.
2. The CSV export.

They appear **nowhere else**: not on cards, not on Kanban tiles, not in
duplicate-cluster listings on the governance page, and not in the synthesised
answer prose. Everywhere a record is referenced for a human, use its title or
name. Where a reference must be clickable, the title is the link.

This is a real bug, not a preference: the current synthesis emits
"Idea idea-0006 and its solution sol-0003", which reads as a stutter.

### 2.2 Controls versus values

A **control** changes what is shown. A **value** is data about a record. They
must never share a visual treatment.

| | Control (filter chip) | Value (tag, facet) |
|---|---|---|
| Shape | Bordered pill, `1px solid var(--border-strong)` | Flat tinted label, no border |
| Affordance | Caret glyph on the right | None |
| Active state | `--accent-tint-strong` background, `--accent` border and text, `x` glyph to clear | n/a |
| Background | `--bg` | `#f6f4ef` |

Clickable facets inside a card footer (service, sub-service) are a third case:
they filter, but they sit in body text. Give them `--accent` text and a
**dashed** underline, so a filter link is visibly not a navigation link (which
uses a solid underline).

### 2.3 Every filterable facet is visible on the card

If a facet can be filtered on, a viewer must be able to see that facet's value
on the card, or filtering feels arbitrary. Current chips and where their value
now appears:

| Chip | Value shown on card |
|---|---|
| Solution type | Header band, left, with icon |
| Technology | Header band, immediately right of solution type |
| Service | Footer, line 2, clickable |
| Sub-service | Footer, line 2, clickable |
| Taxonomy (More filters) | Tag row in card body |
| Year / Month (More filters) | Footer, line 1, right |

### 2.4 One label per corner

Card header band carries at most: solution type plus technology on the left,
match label on the right. Nothing else competes. Technology type is
demoted from a primary badge to a secondary label separated by a 1px hairline
rule, because it qualifies the type rather than standing beside it.

### 2.5 Design tokens

Unchanged from `docs/spec.md` §12 and already implemented in `app/globals.css`.
Do not introduce new colors, fonts, or radii. The full set in use:

`--bg #faf8f4` · `--surface #ffffff` · `--ink #2b2824` · `--ink-muted #6b6459`
· `--accent #3d5a80` · `--accent-tint #eef2f6` · `--accent-tint-strong #e2eaf1`
· `--border #e7e2d9` · `--border-strong #d8d2c6` · `--status-open #8a8375` ·
`--status-review #b8853f` · `--status-duplicate #b0503f` ·
`--status-solved #5b7b5e` · `--radius 2px` · Lora (headings) · Inter (body).

New derived tints, added to `:root` rather than inlined:
`--tint-open #f1efe9` · `--tint-review #f7efe2` · `--tint-solved #eaf0ea` ·
`--tint-duplicate #fbf3f1`.

---

## 3. Tab 1 — Catalog (`/`)

### 3.1 Page structure, top to bottom

1. **Search panel** — one white surface containing the search input, the filter
   chip row, and (after a search) the synthesised answer. Grouping these three
   in one container is what makes the search bar read as the primary act
   without needing to be oversized.
2. **Board** — three columns.

There is no separate "Open ideas" section. Open ideas are the Idea column.

### 3.2 Columns

Three lifecycle columns, left to right: **Idea**, **In progress**, **Solution**.

Each header is: serif column name (19px, weight 600), a count badge, and a
right-aligned muted descriptor, over a 2px bottom border in the column's status
color.

| Column | Border and badge color | Badge background | Descriptor |
|---|---|---|---|
| Idea | `--status-open` | `--tint-open` | not yet started |
| In progress | `--status-review` | `--tint-review` | being built |
| Solution | `--status-solved` | `--tint-solved` | already built |

Column membership: ideas with status `open` go to Idea; status `in progress` to
In progress; **solutions** go to Solution. A solved idea does not appear in its
own card anywhere on the board; it appears as the `Resolves` line on the
solution that resolved it. This is what keeps one topic to one card.

### 3.3 Card anatomy

Three zones, in one bordered surface with `overflow: hidden` so the header band
meets the border cleanly.

**Header band** (`padding: 9px 16px`, background = the column's tint):

- Idea and In progress cards: status word on the left (`Open` / `In progress`),
  weight 600, 11.5px, in the status color.
- Solution cards: solution type with a 13px inline SVG icon, then a 1px × 11px
  hairline rule, then technology type at 11.5px in a lighter weight.
- Right side, only when a search is active: the match label from
  `lib/match-label.ts`. **Reuse `matchLabel()` / `topScoreOf()` /
  `hasAnyRealMatch()`; do not reimplement scoring display.**

**Body** (`padding: 16px`, `gap: 11px`):

- Title: Lora, 18px, weight 600, `line-height: 1.3`. For ideas this is
  `title`; for solutions, `name`.
- Summary: 13px, `line-height: 1.55`, `--ink-muted`, clamped to 3 lines.
- Tag row: flat tinted labels, wrapped, `gap: 6px`.
- Duplicate flag, when present: a tinted `--tint-duplicate` strip with a 6px
  `--status-duplicate` dot and the count, e.g. "2 similar records flagged".
  Candidates inside it are clickable and follow the jump contract from
  Phase 4.1.
- Solution cards only, `Resolves` line: a `--tint-solved`-tinted strip with a
  check icon and the resolved idea's **title as a link**. One line.
  **This replaces the nested "Resolved idea" block entirely.**
- Solution cards only, actions: `Open the artifact` (filled `--accent` primary)
  and `Contact owner` (bordered secondary).

**Footer** (`padding: 11px 16px`, `--surface` at `#fdfcfa`, 1px top border):

- Line 1: owner or submitter name (12px, `--ink`) on the left, date (12px,
  `--ink-muted`) on the right.
- Line 2: `Service: <clickable>; Sub-service: <clickable>` at 11.5px,
  `--ink-muted`, with the values styled per §2.2.

Two lines, not one, because the spelled-out labels wrap inside a ~390px column.

### 3.4 The duplication bug this fixes

The current solution card nests a "Resolved idea" block whose body is the
idea's `solution_summary`. That field is written back from the solution's own
`ai_generated_summary` during enrichment, so the card prints the same paragraph
twice. Verified live on "Dispute Response Starter Prompts" and
"Dispute Email Sorter".

The fix is structural, not cosmetic: solution cards show the resolved idea's
**title only**, as one line. The idea's own text lives on the idea's detail
drawer. Do not attempt to fix this by truncating or de-duplicating strings.

### 3.5 Synthesised answer

Rendered inside the search panel, in Lora at 15px, `max-width: 78ch`.

Prompt changes required in the synthesis call:

- Reference solutions and ideas **by name or title only**. Never emit a record
  id in prose.
- Never prefix a title with its type word ("Idea idea-0006", "the idea
  Handle invoice disputes better"). The title stands alone.
- Named solutions render as links to their card.
- Keep the existing behaviour of naming every real solution found.

### 3.6 Column balance

Columns will still differ in length; the goal is that no column runs several
screens while its neighbours are empty. Two measures:

- The card anatomy above removes the nested block, which was making solution
  cards three to four times taller than idea cards.
- Summary text is clamped to 3 lines on every card type, so height variance
  comes from tags and flags rather than prose length.

Do not add artificial column-height matching or masonry reflow.

### 3.7 Empty and no-match states

Preserve the Phase 1 behaviour exactly: `hasAnyRealMatch()` governs whether the
board shows results at all, and a query with no real match shows the empty
state rather than filler cards. Do not weaken the absolute floors
(`NO_MATCH_TOPSCORE_FLOOR`, `MIN_ABS_FOR_STRONG`, `MIN_ABS_FOR_RELATED`).

---

## 4. Tab 2 — Governance (`/governance`)

This tab needs more work than the board. Six widgets, five of which are
tables, stacked with no hierarchy. A reviewer cannot tell what needs attention
without reading every row, and the most actionable widget (duplicate clusters)
is the least scannable thing on the page.

### 4.1 Lead with the four numbers that matter

Add a summary row directly under the page lede, above every existing widget: four
tiles, equal width, on one row.

| Tile | Value | Sub-label |
|---|---|---|
| Records | `ideas + solutions` | in `<n>` services |
| Awaiting resolution | count of open + in-progress ideas | `<n>` over 90 days |
| Solutions never reviewed | count | of `<n>` built |
| Flagged for review | count of records with a duplicate flag | in `<n>` clusters |

Each tile: value in Lora at 28px, label at 12px `--ink-muted` above it,
sub-label at 11.5px below. `--surface` background, 1px `--border`, 2px radius.
No sparklines, no deltas, no trend arrows — there is no time series behind
these numbers and inventing one would be dishonest.

Each tile's value is a link that opens the relevant widget's section anchor.

### 4.2 Widget order

Reorder to lead with what is actionable:

1. Summary tiles (new, §4.1)
2. Duplicate clusters (moved up from last)
3. Aging
4. Status by service
5. Duplicate rate by service
6. Throughput
7. Every record, by service (dot grid, moved to last)

Rationale: clusters and aging are the two things a reviewer can act on today.
Status, rate, and throughput are context. The dot grid is an overview that
rewards scanning, which is a closing gesture, not an opening one.

### 4.3 Duplicate clusters — the main rework

Current state is a wall of undifferentiated 13px text, with raw record ids
throughout, in which each member is three lines of prose and the "also flagged
with" chips are more ids.

Rework each cluster as a bordered card:

- **Cluster header**: a chip reading `Idea cluster` or `Solution cluster`, the
  member count, and, when applicable, the existing `contains confirmed link`
  chip. Right-aligned: the cluster's similarity range, e.g. `0.73 – 0.82`.
- **Members** as rows inside the card, each:
  - Line 1: title as a link (opens the detail drawer), then the service in
    muted text. No record id.
  - Line 2: `Submitted by <name>, reports to <name>` for ideas;
    `Owned by <name>` for solutions. Both names get the contact affordance
    once the employee directory lands.
  - Line 3, when solved: `Solved — <linked solution title>`, title as a link.
  - Right column of the row: the member's match label against the cluster top
    (already computed by `linksToMembers`), plus a `Jump to card` action using
    the Phase 4.1 jump contract.
- **Cross-links between members** ("also flagged with") become title chips, not
  id chips.

Keep the existing inline expansion behaviour from `ClusterMembers.tsx`; this is
a presentation change, not an interaction change.

### 4.4 Dot grid — accessibility and label fixes

The grid encodes six states in color alone, at roughly 8px per dot, with the
record identity available only on hover.

- Add a shape or fill distinction on top of color: solid fill for solved and
  linked-solution, hollow ring for open and orphan, solid with a darker ring
  for duplicate-flagged and in-progress. Color alone must not be the only
  channel.
- Raise dot size to 10px with a 4px gap; the current density buys nothing.
- Hover-only identity fails on touch. Make each dot focusable
  (`tabindex="0"`) so keyboard and screen-reader users reach the same
  `aria-label` that already exists, and add a click that opens that record's
  detail drawer.
- Rename the heading to `Every record, by service` and the row labels to the
  service name.
- Keep the legend-above-rows placement and the repeat-every-6-rows behaviour
  from Phase 1; both are correct.

### 4.5 Aging

- Replace `—` for zero with `0` in a muted weight. An em dash reads as "no
  data", which is a different claim from "none in this bucket".
- The `Over 90` column carries the only urgent number on the widget; give it
  `--status-review` text when non-zero, and leave the other buckets in
  `--ink`.
- Add a row total column, so a reviewer can see which service has the largest
  backlog without adding three numbers in their head.

### 4.6 Status by service, duplicate rate, throughput

Presentation only:

- Column header `Org` becomes `Service` on both tables.
- Right-align all numeric columns; they are currently left-aligned, which
  makes them hard to compare down a column.
- Apply the `0` rather than `—` rule from §4.5.
- Throughput keeps the Phase 1 fixes (y-axis reference, series separation,
  legend above the chart) unchanged.

### 4.7 Cross-navigation

Every record title on this tab links to that record's detail drawer, and every
service name links to the Catalog tab pre-filtered to that service. Governance
currently dead-ends: a reviewer who spots a problem has no way to reach it.

---

## 5. Tab 3 — Export (`/export`)

The least broken tab. Changes are limited to consistency:

- Copy: "org, service" becomes "service, sub-service" in both download
  descriptions.
- The two download cards get the same `--surface` / `--border` / 2px radius
  treatment as cards elsewhere, and the download buttons use the same filled
  `--accent` primary style as `Open the artifact`. They currently use a
  one-off `artifact-button` style.
- Add a column list under each card as a compact monospace-free list rather
  than a prose sentence, so a person can check whether the export has the field
  they need without downloading it.
- Keep the point-in-time / synthetic-data disclaimer exactly as written. It is
  honest and correctly prominent.
- Record ids stay in the CSV. This is the one surface where they are the
  correct thing to emit (§2.1).

---

## 6. Detail drawer (all tabs)

One shared component, already built in Phase 4 as `RecordDetail` /
`RecordDetailDrawer`. Changes:

- Add the record id as a muted 11.5px line under the title. This is one of the
  two places ids are allowed.
- Footer gains the same two-line owner and service block as the card (§3.3).
- Linked-record info stays as built in Phase 4.1, both directions.
- Duplicate candidates keep the Phase 4.1 jump contract.
- The drawer currently ends about 40% down its height with blank space below.
  Do not pad it with invented content. Constrain the drawer to its content
  height and let the panel end.

---

## 7. Out of scope for this document

- **Contact owner / mailto and the employee directory.** The button appears in
  this spec so the card layout is final, but it is inert until the directory
  phase. Do not wire it here.
- **Solution artifacts.** `Open the artifact` currently points at a placeholder
  `sharepoint.example` URL and is a known no-op. Generating real artifact files
  is its own phase.
- **Flag as reviewed.** Still out of scope. There is no write-back store.
- **Mindmap / graph view.** Unchanged and still its own phase, after this one.

---

## 8. Build sequence

Each step ends at a clean commit and a manual click-through. Do not queue them
back to back.

1. **Global tokens and the control/value split** (§2.2, §2.5) — new tints,
   filter chip and tag treatments, facet link style. Smallest change, touches
   every later step.
2. **Naming pass** (§1) — every user-facing label, all three tabs, no stored
   field renames. Mechanical, verify by grepping for `Org` in JSX.
3. **Card anatomy and the board** (§3) — the largest step. Includes deleting
   the grid, the nested-block fix, and the ID policy on the board.
4. **Synthesis prompt** (§3.5) — small, but re-run the §0 Q1/Q2 queries after
   it and diff rankings and scores to 4 decimal places, per the Phase 4
   discipline. A prompt change must not move retrieval.
5. **Governance** (§4) — summary tiles, widget reorder, cluster rework, dot
   grid accessibility, table fixes, cross-navigation.
6. **Export** (§5) — smallest, do last.

After every step: `npm run build` and `npx tsc --noEmit` clean, and a named
click-through of what that step changed. `npm run verify-duplicates` only needs
re-running if `npm run enrich` is re-run, which none of these steps require.

---

## 9. What must not change

- `lib/retrieval.ts` and `lib/openrouter.ts` scoring and ranking logic. The
  synthesis **prompt** changes in step 4; the retrieval path does not.
- `lib/match-label.ts` thresholds and floors, and the requirement that any
  component showing a match score reuses its exports.
- The duplicate threshold (0.7118) and `scripts/verify-duplicates.ts`. The
  margin is roughly 0.0002 on either side; re-run the harness after any future
  `npm run enrich`.
- Dataset variants and the `DATASET_VARIANT` environment switch, with no
  in-product toggle.
- Synthetic data only. No real organisation names, no secrets, no write-back.

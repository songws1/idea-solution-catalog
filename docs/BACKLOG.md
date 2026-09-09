# Backlog — Addendum A Rollout

**Last updated:** September 9, 2026
**Status:** Phases 1-4.1 complete and verified. The v3 build sequence is
**finished**. On top of it: a v4 visual pass, deployment hardening, a
board-density pass, the employee directory (v4.2), real solution artifacts
(v4.3), the "before you build" check (v4.4), that check moved to the front
door (v4.5), the second search box folded into it (v4.6), and the duplicate
result rendering removed (v4.7). The mindmap is deliberately **not** next — see
the v4.4 note.

---

## Done (verified, not just claimed)

- **Phase 1 — Score legibility (§3) + dashboard fixes (§4).** Complete.
  Includes a same-day UAT bug fix not in the original addendum: a
  whole-result-set floor (`NO_MATCH_TOPSCORE_FLOOR` in `lib/match-label.ts`,
  wired into `SearchView.tsx`) so a query with no real matches (e.g.
  "cooking") shows the empty state instead of 8+ filler cards, some of
  which were previously mislabeled "Strong match." Also fixed: the
  per-tier label thresholds now require an absolute score floor
  (`MIN_ABS_FOR_STRONG`/`MIN_ABS_FOR_RELATED`) on top of the relative
  math, for the same reason.
- **Phase 2 — CSV export (§5).** Complete. `/export` route, two CSVs
  (ideas/solutions), RFC-4180 escaping verified, names resolved via
  existing `userName()`, respects `DATASET_VARIANT`.
- **Phase 3 — Taxonomy fix + `technology_type` field (§1.3).** Complete.
  Fixed 20-tag taxonomy enforced in code (LLM output filtered against
  `ALLOWED_TAGS`, off-list tags dropped and logged). `technology_type`
  added to `SolutionRecord`, assigned at seed time (not LLM-inferred) from
  Chris's fixed list (ChatGPT / Claude / AI + RPA / AI + local automation
  / Local automation / RPA / Process improvement / Other). Both datasets
  regenerated; `npm run verify-duplicates` re-run and PASSED on live
  output (not just claimed — console output checked directly): 6/6
  planted clusters caught, 0 false positives, both variants.
- **Phase 4 — Landing page + filter bar + Kanban (§1, §2.1-2.5).**
  Complete. Commit `d1db5f6`. Catalog landing page with the unified
  filter bar, Kanban results view, one shared card-detail component
  (`RecordDetail` / `RecordDetailDrawer`); `ResultsPanels` and
  `ConnectorLayer` retired.
- **Phase 4.1 — Bug fixes on Phase 4.** Complete. Four fixes:
  - Duplicate-candidate click now jumps to that record's tile (scroll +
    flash highlight) — clearing search/filters back to the browse grid
    when the tile isn't in the current view — and never opens a drawer
    except as a last resort for candidates with no tile anywhere
    (solved/linked ideas). The on-card `DuplicateBadge` candidate rows
    are clickable under the same contract.
  - Linked-record identity (name/title + org) shown inline above the
    "View linked solution/idea" action in the detail drawer, both
    directions.
  - "Estimated savings from reuse" governance widget removed entirely
    (component, page usage, the Widget 5 block in `lib/governance.ts`,
    orphan CSS).
  - Idea-title vs solution-name presentation checked across search
    results, Kanban cards, and the detail view: field usage is consistent
    everywhere; the wording divergence is seed data, not presentation.
    No code change needed.
  Verified working in the running app (`npm run build` and
  `npx tsc --noEmit` clean). Committed as `2810dd4`.

---

## Known fragility to watch, not a blocker

**Post-enrichment duplicate threshold (0.7118) is razor-thin.** Verified
live: the planted `sol-0011`~`sol-0020` pair sits at 0.7120, the nearest
non-planted pair (`idea-0005`~`idea-0006`) sits at 0.7116 — a margin of
0.0002 on either side of the threshold. It passes today, confirmed by
running `npm run verify-duplicates` directly. But this margin leaves
essentially no room for normal variance (LLM sampling differences in
`ai_generated_summary` text on a future re-run, etc.) to flip a miss or a
false positive.

**Action:** re-run `npm run verify-duplicates` after *any* future
`npm run enrich` — never assume this threshold still holds once the
summaries/embeddings regenerate again. Worth adding a one-line comment to
that effect directly in `scripts/enrich.ts` near the threshold constants
next time that file is touched (small, no urgency).

---

## UX redesign v3 (`docs/ux-redesign-v3.md`) — complete

v3 comes from a live UX review of the running app on 2026-09-06 and
supersedes Addendum A §1-§2 in full. Read order per the spec:
`docs/spec.md`, then `docs/ux-redesign-v3.md`; do not read Addendum A.

**The structural decision (v3 §0):** Kanban is the only layout — the card
grid is deleted, not toggled. This absorbs what was previously scoped as
"Phase 4.8 — Kanban on landing page"; that phase no longer exists as
separate work.

Build sequence (v3 §8 — each step ends at a clean commit and a named
click-through; `npm run build` + `npx tsc --noEmit` clean after each):

1. **Global tokens and the control/value split** (§2.2, §2.5) — new
   tints, filter chip and tag treatments, facet link style. Smallest
   change, touches every later step. **Done — commit `952afe2`.**
2. **Naming pass** (§1) — every user-facing label on all three tabs;
   `org`/`service` relabelled Service/Sub-service in the UI with stored
   field names unchanged. **Done — commit `6836883`.**
3. **Card anatomy and the board** (§3) — the largest step: grid deleted,
   nested "Resolved idea" block replaced by a one-line `Resolves` title
   link, record-id policy enforced on the board. **Done.**
4. **Synthesis prompt** (§3.5) — **Done.** Prompt and context both moved to
   `lib/synthesis.ts` (a Next.js route module may only export handlers). The
   context no longer contains a single record id and resolves
   `resolves_idea_id` to the idea's title, which is what actually stops the
   "Idea idea-0006 and its solution sol-0003" stutter — the model can only
   cite what it is shown. `stripRecordIds` is a last-resort net over the
   model's output. **The retrieval-score diff the spec asks for was not run,
   and does not apply**: this step touches only the chat call, which happens
   after `retrieve` has already ranked. No embedding, scoring or threshold
   code was read or modified; `scripts/phase4-check.ts` passes unchanged.
5. **Governance** (§4) — **Done.** Summary tiles (§4.1), widget reorder
   (§4.2), duplicate clusters as bordered cards with a similarity range,
   per-member match label and jump action (§4.3), dot-grid accessibility
   (§4.4 — every dot is now an anchor, so focus, keyboard and touch all work
   without the old hover-only identity), aging zeros and totals (§4.5),
   right-aligned numerics (§4.6), cross-navigation (§4.7).
6. **Export** (§5) — **Done.** Shared button style, and the column list is
   rendered from the CSV writer's own header arrays so it cannot drift from
   the file.

`npm run verify-duplicates` only needs re-running if `npm run enrich` is
re-run, which none of these steps require.

---

## v4 visual pass + deployment readiness (out of the v3 sequence)

Requested directly after v3 step 3, and deliberately **not** a v3 step: it
changes how the app looks and how it deploys, not what it does. Steps 4-6
were completed afterwards, on top of this pass.

- **Visual system rebuilt in `app/globals.css`.** Warm editorial palette
  (cream ground, Lora headings, 2px radii) replaced by a cool neutral
  ground, one indigo accent, a radius/shadow scale, and Inter throughout.
  Structure was preserved: no class was renamed and no component markup
  changed for the palette work, so the v3 rules that matter — Kanban as
  the only layout, the §2.2 control/value split, the record-id policy —
  carry over intact. Lanes became sunken containers with a status dot and
  count badge; governance numerics right-align and shrink to fit.
- **Fonts self-hosted** via `@fontsource-variable/inter`, replacing
  `next/font/google`. The build no longer fails when Google Fonts is
  unreachable, and the running page makes no third-party font request.
- **Header nav gained an active state** (`components/shell/SiteNav.tsx`,
  split out because `usePathname` needs a client component) and the
  wordmark swaps to a short label under 700px.
- **`/api/search` spend guards.** The key was already server-only and
  carries no `NEXT_PUBLIC_` prefix, and a grep of the built client chunks
  confirms neither the key name nor the OpenRouter endpoint reaches the
  browser. The exposure on a public deployment is the open *endpoint*, not
  the key: every call spends credit. Added `lib/rate-limit.ts` (12 requests
  per client per minute, per serverless instance) and a 300-character query
  cap, both rejecting before any paid call. These are backstops — Vercel
  Deployment Protection is the real gate, and the README says so.
- **Security response headers** in `next.config.mjs` (nosniff, DENY
  framing, referrer policy, permissions policy); `x-powered-by` removed.
- **README** rewritten where it had gone stale (it still described two
  linked search panels, a connector line, and the removed savings widget)
  and given a real Vercel deployment section.

Not touched, deliberately: retrieval, scoring, `lib/match-label.ts`
thresholds, the 0.7118 duplicate threshold, the datasets, stored `org` /
`service` field names, and the deferred items below.

---

## v4.1 board density (spec revision — read this before trusting v3 §1/§3.3)

Chris's read of the running v4 board: the tone was right but it was "busy and
too text-heavy" to work in. Two v3 details are the cause, and both are now
**deliberately superseded**. They are recorded here rather than edited into
`ux-redesign-v3.md`, so the original intent stays legible.

- **§3.3's status word on idea cards is gone.** Every card in the Idea lane
  opened with "OPEN" and every card in the In progress lane with "IN
  PROGRESS" — a whole row of type repeating what the column header above it
  already said, on 40 of 65 cards. Status is now a 3px colored left edge on
  the card, and the header band renders only when it carries something the
  card does not otherwise show: a solution's type and technology, or a match
  label during a search.
- **§1's card footer `Service: <x>; Sub-service: <y>` is now `<x> · <y>`.**
  The spelled-out form wrapped to two lines on every card and repeated a
  label the reader learns once. §2.3 only requires the facets be visible and
  filterable, which they still are; the labelled form is kept in the detail
  drawer, where there is room and no repetition.

Also in this pass: card summaries clamp at two lines instead of three, and
footer facets render as muted text with a dotted underline that takes the
accent only on hover — with two per card across 65 cards, accent-colored
links were burying the titles they sat under. The §2.2 control-versus-value
contract is unchanged in substance: a facet is still a value that happens to
be clickable, and now looks like one.

Governance got the same treatment where it had the same problem: cluster
member names and cross-link chips sit muted until hovered, so the row's title
is the thing that reads first.

---

## After the v3 sequence

- **Mindmap / graph view** (Addendum §2.6) — still its own phase, built
  and reviewed after the v3 work is stable; v3 §7 leaves it unchanged.
- ~~**Solution artifacts**~~ — **Done in v4.3, see below.**
- ~~**Employee directory**~~ — **Done in v4.2, see below.**

---

## v4.2 — employee directory, board order, match explainer

Three things Chris hit while using the deployed app, plus the directory
decision that had been parked waiting on him.

- **`data/users.json` now carries an `email`.** This was the parked question
  ("extend users.json or add a new file?") — answered: extend it. The address
  is derived from the display name by `scripts/generate-seed.ts` onto the
  reserved `gbs.example` TLD, which cannot resolve, so the app ships real
  mailto links with no possibility of reaching a real inbox. `manager_id` was
  already there, so no other field was needed.

  The committed `users.json` was patched in place with the same derivation
  rather than by re-running `npm run seed`: that script also rewrites
  `seed-records.json`, which would invalidate the committed datasets and their
  embeddings. Verified afterwards that all 35 addresses match what the seed
  script would now generate, and that all 35 are unique.

- **Owner and submitter names are contact links** on card footers, in the
  detail drawer (owner and builder), and on governance cluster rows. The
  "Contact owner" button that v3 §7 deliberately shipped inert is now live —
  the only reason it was inert was the missing address. A name whose id does
  not resolve renders as plain text: a dead mailto is worse than none. The
  subject line names the record by title, never by id, so §2.1 does not leak
  through the mail client. `DuplicateClusters` no longer derives its own
  address locally; it reads the directory like everything else.

- **The board has a stated order.** It had none: cards came out in whatever
  order the seed script wrote them, which is stable but meaningless. Browse
  mode now defaults to newest first with a visible Order control (newest,
  oldest, title A–Z), sorted in `lib/board-sort.ts` with a title tiebreak so
  the order is total and stable across renders. Search mode is deliberately
  not sortable — there the order IS the answer — and says so in place of the
  control rather than showing one that does nothing.

- **The similarity scale is explained in plain language** (`MatchHelp`), as a
  closed disclosure next to the results and on the duplicate-clusters widget.
  It says what the number measures, that it is not a percentage, that labels
  are relative to the best result in that one search, and that a set with no
  real match shows nothing rather than confident-looking noise. Kept in sync
  with `lib/match-label.ts` by hand — if those tiers move, the wording has to
  move with them.

---

## v4.3 — real solution artifacts

Every solution card's primary action pointed at a placeholder
`sharepoint.example` URL. The one thing a person comes to this catalog to do —
"go get the thing" — was the one thing that did not work. All 25 now download a
real file.

- **Generated at request time, not committed.** `lib/artifact-file.ts` builds
  the document from the record and `app/artifact/download/route.ts` serves it,
  the same shape as `/export/download`. Committing 25 files would have meant a
  copy of text that already lives in the dataset, drifting the moment
  `npm run enrich` regenerates a summary.
- **Three genuinely different documents**, because the three artifact types are
  reached for with different intent: a *prompt* file leads with a
  paste-ready block, a *skill* file with its definition and scope, an
  *automation* file with what it does and the runbook the next person needs.
  One shared template would have been a rename, not an artifact.
- **They describe, they do not pretend to run.** Emitting a plausible-looking
  automation script that cannot execute would be a more convincing lie than the
  placeholder it replaces. The automation runbook is explicitly headed "to fill
  in from the working copy" and says the catalog does not hold that detail.
  Every file opens with a synthetic-data banner.
- **The stored `artifact_link` field is deliberately unchanged** in the dataset
  and the CSV. It is part of the synthetic story — where the artifact would
  live in a real deployment — and Addendum A §5 defines the CSV as the
  flattened record fields. Rewriting committed records to point at an app route
  would confuse the two. The UI links to the route; the data keeps its field.

Verified: all 25 generate with unique filenames, no record-id leak, no
`undefined`/`null` in any output; the board carries 25 download links and zero
remaining `sharepoint.example` links on any tab; a real download was driven in
a browser and arrived as `access-grant-script.md`.

Out of scope, unchanged: a real SharePoint integration, auth, and any
folder-browsing UI.

---

## v4.4 — "before you build" overlap check

### Why this and not the mindmap

The mindmap was the last item on the original roadmap and was skipped on
purpose. Two reasons.

First, what the research says actually kills internal catalogs. The failure
mode is not weak search or missing visualisation, it is staleness: a catalog
describes the world as of the last time someone updated it, people start asking
whether it is accurate, and it loses authority and gets abandoned. Most teams
quit when the maintenance cost exceeds the value of a catalog that is accurate
to within a week. A graph view does nothing about that.

Second, the deployment reality. The production shape of this catalog is a
browse/search screen on the existing Power Apps intake tool, backed by a
SharePoint list. A force-directed graph transfers to that build not at all,
while an overlap check at intake transfers directly — it is a step in a form.

### What the check is

Browse and search only ever reach the person who already thought to look, and
nobody searches a catalog they have not remembered exists. The moment that
actually decides whether effort gets duplicated is when someone is about to
start. So `/check` takes a description of intended work and returns a verdict.

The distinction that makes it more than search is between two kinds of overlap
that a ranked list flattens into one:

- a built **solution** overlaps → the thing exists, go and get it;
- an unsolved **idea** overlaps → someone already asked, so join their request
  rather than filing a second one that competes for the same build slot.

Four verdicts — `exists`, `already-asked`, `related`, `clear` — each with a
stated next step, and every matching record carries the action it makes
possible (download the artifact, contact the owner, reach whoever asked).

### Decisions worth keeping

- **No second similarity scale.** `lib/overlap.ts` imports
  `MIN_ABS_FOR_STRONG`, `MIN_ABS_FOR_RELATED` and `NO_MATCH_TOPSCORE_FLOOR`
  from `lib/match-label.ts`. A scale re-picked by eye here would quietly
  disagree with the labels on the board and one of the two would be wrong.
- **`exists` requires a DIRECT solution hit.** A solution pulled in by the
  cross-reference join is present because its paired idea matched, not because
  it matched. Saying "this already exists" on that basis is the one failure
  this feature cannot afford.
- **A solved idea never shows as "already asked".** It is represented by the
  solution that resolved it, which is the record you can act on.
- **No chat call on a `clear` verdict.** There is no overlap to explain, so
  spending credit to say so would be waste.
- The route shares the rate-limit window and key guard that `/api/search` used;
  the length cap is higher (1200) because a description of intended work runs
  longer than a search question. (In v4.6 this route absorbed `/api/search`
  outright.)

### Verification

`npm run check-overlap` drives `retrieve` + `assessOverlap` with the dataset's
own embeddings, so the verdict logic is verified with no API key and no spend:
an existing solution's own text verdicts `exists` and names itself first, an
unsolved idea's own text surfaces as `already-asked`, an unrelated vector
verdicts `clear` and returns nothing, no solved idea leaks into the
already-asked list, and no verdict lists more than three of either kind.

---

## v4.5 — the check is the landing page

Chris's read, and the right one: the product's thesis is "do not build what
already exists". The catalog is the means and the check is the end, and leading
with the board led with the means. "Catalog" is a noun; "before you build" is a
verb, and the verb is what gets used.

**But not as a bare swap.** Three things argued against simply replacing the
board with the check:

- The check needs an API key and spends credit on every run. The board renders
  from committed data with no API call at all. A check-only front door shows an
  error as the first thing anyone sees the moment a key is missing or the spend
  cap is reached — the worst possible failure for a page whose other job is
  being demoed to stakeholders.
- Not everyone arriving is about to build. Some are browsing, some are leaders
  going to governance, some followed a link. A single-intent front door assumes
  otherwise.
- A `clear` verdict would dead-end. "Nothing matches, go ahead" with nowhere to
  go next.

So it is a **reorder, not a swap**: `/` leads with the check panel and keeps the
board below it on the same page. `/check` redirects to `/`, and the nav drops
back to three items because the check and the board are now one page.

The real cost of the merge is two text inputs on one page asking different
questions, which is genuinely confusing if both look equally important. Fixed by
demoting the board's search rather than removing it: the search panel loses its
white surface and elevation, its input and button shrink, and it sits under an
"Or browse what already exists" section heading. It keeps every capability it
had — semantic search, chips, sort, the synthesised answer — and simply stops
competing with the check for the reader's first move.

---

## v4.6 — one input, not two

Chris's challenge: *"do we need the second search bar?"*

No. And the honest answer is that v4.5 kept it for a bad reason — it existed,
and demoting it visually felt like enough. It was not. Look at what the two
inputs actually did:

| | check panel | search bar |
|---|---|---|
| input | free text | free text |
| what it did | embed it, rank the catalog | embed it, rank the catalog |
| what came back | a verdict + the closest records | a sentence + the ranked board |

Same input, same retrieval, same corpus. The only difference was the **shape of
the answer** — and a difference in output shape is not a reason to make the
reader choose an input. It is a reason to give one input two layers of answer.
v4.5's fix (shrink the second box, put "Or browse what already exists" above
it) treated a structural duplication as a styling problem.

So the two merged. One textarea; one `POST /api/check`; the response now
carries the full ranked `ideas`/`solutions` sets alongside the verdict, and the
board consumes them exactly as it consumed the search response. Everything the
search did still happens — semantic ranking, match labels, chip filtering of
ranked results, the relative-label scale, the "ranked by match" note replacing
the sort control — it just happens without being asked for separately.

**What went:** `app/api/search/`, `components/search/SynthesizedAnswer.tsx`,
`SearchApiResponse`, `SYNTHESIS_SYSTEM_PROMPT`, `scripts/phase4-live-check.ts`,
and ~150 lines of CSS. `stripRecordIds` stayed in `lib/synthesis.ts` — the
check writes prose about records too, so §2.1 still applies to it.

**What was gained beyond the removal:**

- **Half the spend per question.** One embedding call instead of two, and the
  chat call is skipped entirely on a `clear` verdict. The old flow charged
  twice for the same retrieval if a reader used both boxes.
- **One explainer, not two.** `MatchHelp` sits on the board's control row,
  beside the match labels it explains. It is deliberately *not* on the verdict:
  the verdict states a judgement in words and carries no labels, so an
  explainer there would point at nothing.
- **The board renders on error now.** Previously an API error hid it. Since the
  whole argument for keeping the board on this page is that it survives a
  missing key or an exhausted spend cap, hiding it on failure defeated the
  point.

**What did not change:** the board is still the only layout (v3 §0), record ids
still appear only in the drawer and the CSV (§2.1), the stored `org`/`service`
field names are untouched (§1), and the thresholds still come from
`lib/match-label.ts` — no second similarity scale.

### Verification

`npm run check-overlap` and `scripts/phase4-check.ts` both pass unchanged.
`npx tsc --noEmit` and `npm run build` clean. The checked state was
screenshotted end to end by fulfilling `/api/check` with a payload generated
offline from a solution's own embedding (no key, no spend): verdict `exists`,
three solution matches and three idea matches above, the same records
re-ranked with match labels on the board below.

---

## v4.7 — the board is the only place a record is drawn

Chris again, one release later: *"what the 6 tiles that shows up under the
search and many more in the catalog section? aren't we repeating and confusing
people?"*

He was right, and this is the same mistake v4.6 was supposed to fix, caught on
the other side. v4.6 removed the duplicate **input** and left the duplicate
**output** standing.

The verdict block rendered up to three solutions and three ideas as cards. The
board below rendered the retrieved set ordered by score. Those were not merely
similar sets — `assessOverlap` picks the top three of each type by score, and
the board sorts by that same score, so **the code guaranteed the verdict cards
were the board's own first tiles.** In the screenshot Chris sent, six of six
verdict cards reappeared on the board.

The duplicate was also the worse of the two renderings: the board card carries
tags, the "Resolves" cross-link and the duplicate-candidate flag; the verdict
card carried none of them.

And on a `related` verdict the page said *"Nothing covers this"* and then laid
out six records beneath it, which reads as a contradiction rather than as
evidence.

**What changed:**

- The `MatchCard` grid is gone. `VerdictBlock` is now the verdict sentence, the
  action, and the explanation. The board is the only place a record is drawn.
- Verdict copy points at the board ("first in the Solution column below")
  instead of at cards that no longer exist.
- **After a check the board shows only "Strong match" and "Related".** This is
  v3 §3.7 (no filler cards when nothing really matches) applied one tier up:
  retrieval always returns its top N, so a description with two real neighbours
  still trailed six weak tiles behind it, and a tile on a board headed "ranked
  by match" reads as a match whatever its label says.
- The line above the board says how many were left off and links to clearing
  the check. Silent truncation would be worse than the noise it removes.
- The match label became a pill with tier colour. It was a quiet grey caption
  when the board was a browsable list under the real evidence; now the board
  *is* the evidence, so the label has to survive a column scan.
- `KanbanCard` no longer falls back to printing the raw cosine score when the
  label is null. "0.28" reads as a percentage to anyone who has not read
  `lib/match-label.ts`. No label now means no claim.

**Known trade-off, accepted:** when a description matches one record very
closely, the relative scale compresses everything else below the bar and the
board can come back as `Idea 0 / In progress 0 / Solution 1`. Two empty lanes
to show one card looks thin. It is also the honest answer — nobody asked,
nobody is building, one thing exists — and the lane counts are what say so, so
the lanes stay. Revisit only if it turns out to be the common case rather than
the extreme one.

### Verification

`npm run check-overlap` and `scripts/phase4-check.ts` pass unchanged; `tsc` and
`npm run build` clean. Both checked states were screenshotted end to end
against payloads generated offline from dataset embeddings (`mkfixture.ts`, no
key, no spend): an `exists` verdict with one strong match, and a `related`
verdict produced by diluting a record vector toward deterministic noise.

---

## Open/parked items (not urgent)

- The threshold-fragility comment in `scripts/enrich.ts` (see above) —
  small documentation addition, do whenever convenient.
- No other open decisions remain from the addendum — all three items that
  were originally flagged for sign-off (chip set, taxonomy fix, panels
  vs. mindmap) were resolved before Phase 1 started.

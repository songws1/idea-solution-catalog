# Backlog — Addendum A Rollout

**Last updated:** September 10, 2026
**Status:** Phases 1-4.1 complete and verified. The v3 build sequence is
**finished**. On top of it: a v4 visual pass, deployment hardening, a
board-density pass, the employee directory (v4.2), real solution artifacts
(v4.3), the "before you build" check (v4.4), that check moved to the front
door (v4.5), the second search box folded into it (v4.6), and the duplicate
result rendering removed (v4.7), staleness signals (v4.8), and the dataset
roughly doubled with a cross-functional service (v4.9, corrected in v4.9.1).
The mindmap is
deliberately **not** next — see the v4.4 note.

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

## v4.8 — staleness signals

The failure mode named back in v4.4 as the thing that actually kills internal
catalogs, finally addressed. Research says a catalog dies of staleness rather
than of weak search: it describes the world as of the last time anyone updated
it, people start finding entries that are no longer true, and it loses
authority. For this app the exposure is sharper than for a plain catalog,
because the whole page rests on one sentence — *"this already exists, go and
get it"*. If the record behind that sentence has not been confirmed in two
years, the app has not merely failed to help; it has sent someone down a path
that costs more than building would have.

### What was built

**`lib/freshness.ts`** — one scale, pure functions of a date and `now`, used by
the board, the drawer, the verdict and the governance math so none of them can
disagree.

Graded against `date_last_reviewed`, not `date_built`. A solution built fifteen
months ago and reviewed last month is in better shape than one built six months
ago that nobody has looked at since; grading on build date would have flagged
the wrong records.

Two vocabularies, deliberately. A solution goes **stale** (it may no longer
work); an unsolved idea goes **dormant** (still a real want, nobody picked it
up). One word for both would lose the difference that decides what to do next.

**Where it surfaces:**

| | shows |
|---|---|
| board card | a pill, only for `stale` / `unreviewed` / `dormant` |
| detail drawer | the full sentence with its consequence, for every non-current state |
| `exists` verdict | a red caution line when the answer rests on an unvouched-for build |
| governance | recalibrated aging tables + a "Not confirmed working" headline tile |

**"Ask the owner if it still works"** — a pre-written mail to the solution
owner, offered only on a record actually in doubt. The obvious design was a
button that stamps a new review date, but this prototype must not write back to
any real system and a control that looks like it saves when nothing is saved is
worse than none. Asking a human is the real-world version of the action anyway,
and it is what the Power Apps build would put behind its own confirm button.

### Two things caught in review, worth recording

**The mark landed on 40 of 65 cards.** At that density a pill is part of the
card template, not a flag, and it undoes two rounds of density work. Fixed by
splitting `isCardWorthy` from `isNoteworthy`: the middle tiers (`aging`,
`waiting`) never reach a card, because a mark whose own sentence reads
"probably fine" is noise by definition. They still appear in the drawer and are
still counted on the dashboard — a card is a scanning surface, a drawer is a
reading surface, and they earn different bars. Now 18 of 56.

**The governance aging widget was already broken and nobody had noticed.** Its
30/90-day buckets put 37 of 40 unsolved ideas and 20 of 25 solutions in a
single column, so it drew one full bar and two empty ones. The boundaries now
come from `lib/freshness.ts` — the same thresholds that mark a card — and the
solution columns read 6 / 12 / 7. The point is less the numbers than the shared
source: a reviewer who sees "3 over 12 months" and then opens the board must
find exactly those three marked, or both views quietly lose credibility.
`AgingRow`'s fields were renamed `recent`/`mid`/`old` at the same time, because
`under30`/`d30to90`/`over90` hard-coded the old boundaries into identifiers
that nobody would notice had become lies.

### Verification

`npm run check-freshness` (no API key, no spend) asserts the things that would
break quietly: fresh records stay silent, every tier actually occurs in the
committed dataset, a null review date never reads as current, the reassuring
tiers never reach a card, card marks stay under half the board, the aging
buckets account for every record and no column holds more than 70%, and — the
one that matters most — **the governance counts equal the set of cards the
board marks.** Two independently-tuned scales would pass every other assertion
here and still contradict each other in front of a reviewer.

`check-overlap` and `phase4-check` pass unchanged; `tsc` and `build` clean.

---

## v4.9 — the dataset doubles, and gains a general service

From Chris's light UAT: testers typed plausible things and got nothing back,
and asked what they were supposed to put in the box. Telling them "anything"
did not work, because a lot of what they typed returned nothing.

### The diagnosis, which is not only "more data"

A `clear` verdict is the product working. "Nothing in the catalog is close, go
ahead" is a correct and useful answer. The failure was that **a tester cannot
distinguish an accurate empty answer from a broken search**, so every honest
"no" read as a defect and the interface never got evaluated.

Two causes, and the data one is the bigger:

- **No breadth.** Every record was function-specific process automation. A PDF
  splitter, a small project tracker, a review-checklist prompt — all outside
  the catalog entirely, though all are things a shared-services employee
  plainly builds.
- **No depth.** Eight to thirteen records per service meant a tester could type
  an ordinary request *inside* a covered function and still miss, because that
  service's dozen records happened not to include it.

### What changed

**63 → 127 ideas, 25 → 55 solutions, 5 → 6 services, 35 → 42 users.**

`General Business Process` is the new service, and it is not a department. It
is the cross-functional layer: Document Handling, Meetings & Coordination,
Reporting & Analysis, Drafting & Review, Knowledge & Search. This is also the
honest shape of a real catalog — a GBS org's most-duplicated builds are exactly
these, because five teams each write their own meeting-notes prompt without
knowing about the other four.

A planted near-duplicate pair now demonstrates that directly: `gen-mtg-01`
(General Business Process) and `exp-hr-08` (HR Shared Services) ask for the same
meeting write-up, and two solutions were built independently. The old dataset
could not show this, because every record sat inside one function.

The tag taxonomy grew 20 → 26. The original fifteen domain tags and five
cross-cutting ones were right for function-specific automation and wrong for
generic tooling: a PDF splitter had no honest tag and would have been forced
into a domain it has nothing to do with, making retrieval worse. The six
additions are subject-matter tags. **The SHAPE of a solution — extract, triage,
summarise, draft, check — is a different axis and was deliberately kept out**,
because that is what Chris's proposed "design pattern" attribute would be, and
encoding it as tags now would mean maintaining the same idea twice.

The three example chips were also spread across the range. Testers took their
cue from them: three finance-flavoured examples produced either a fourth
finance one or something wildly outside the catalog.

### The threshold problem, fixed properly

Regenerating the dataset invalidates the duplicate thresholds — flagged twice
before as a known fragility, with the post value running on ~0.0004 of margin.
The old fix was a human trying values until `verify-duplicates` went green,
which is a bad loop and an unusable one across a chat boundary: whoever holds
the API key runs enrich, reports a failure, waits for a new number.

That number was never a judgement call. `npm run tune-duplicates` derives it:
below what every planted cluster needs to stay connected, above the strongest
similarity between records not planted together, midpoint of the gap. `--write`
sets it in `enrich.ts`.

One subtlety worth recording, because the first version got it wrong.
Constraining on the weakest *pair* inside a planted cluster is the obvious
reading and is too strict: detection joins records transitively, so a
three-member cluster is caught whenever a connected path clears the threshold,
even if its far pair does not. That version reported the pre-enrichment dataset
as having no valid threshold at all, when 0.65 has worked for months. The
correct bound is the cluster's **bottleneck** — the weakest edge in its maximum
spanning tree.

Sanity check on the method: run against the committed datasets it returns
**0.7118** for post, which is exactly the hand-tuned value already in
`enrich.ts`.

### Status: needs an enrich run

**The seed is written; the datasets are not regenerated.** This session's
container has no `OPENROUTER_API_KEY`, so `npm run enrich` cannot run here and
the committed `dataset-*.json` files still hold the old 88 records. The app
therefore still shows the old data until someone with the key runs:

```bash
npm run seed
npm run enrich
npm run tune-duplicates -- --write
npm run enrich
npm run verify-duplicates
```

Estimated cost well under $0.20 — embeddings for ~180 records plus summaries
for ~30 new solutions; the existing 25 are served from `.enrich-cache/`.

The new data was smoke-tested offline instead, by generating a dataset-shaped
file from the seed with pseudo-random embeddings: the board, the filters and
the governance dashboard all render correctly at 182 records across 6 services,
and `General Business Process` appears in the Service filter and the aging
table. Retrieval quality is the one thing that could not be checked without the
real embeddings.

---

## v4.9.1 — the collisions the first run found

The v4.9 enrich run failed `verify-duplicates`. Reading the output properly
matters more than the fix:

```
Planted clusters: 8. Missed: 0.
```

**Detection was perfect.** Every planted cluster was caught, including the new
cross-function meeting pair. The failures were all FALSE-POSITIVE lines — and
every one of them named a pair that genuinely is the same record written twice:

| | |
|---|---|
| `fin-fr-01` / `exp-fin-02` | two month-end close checklists |
| `hr-x-01` / `exp-hr-01` | two exit-interview theme digests |
| `hr-ld-01` / `exp-hr-05` | two mandatory-training chasers |
| `it-as-02` / `exp-it-04` | two disposal-certificate tools |
| `fa-x-01` / `exp-fac-06` | two parking waitlists |
| …and six more | |

So the detector was right and the seed annotations were wrong. Sixty-four new
records were authored against an existing sixty-three without checking them
against each other, and eleven were restatements. That is the honest account.

### Resolution: plant four, rewrite eight

A flagged pair has exactly two valid resolutions and only the author knows
which applies.

**Planted** where the duplication is real and worth showing:
`dup-meeting-actions` grew to four ideas across HR, IT and two general records —
the strongest example in the dataset of the thing this product exists to catch.
Plus `dup-close-checklist`, `dup-exit-themes`, `dup-case-file`.

**Rewritten** where it was an accident that added a duplicate without adding
coverage — the opposite of the point of the expansion. Eight ideas and three
solutions moved onto subjects the catalog genuinely lacked: retiring dead
training courses, finding one supplier recorded under several names, planning a
floor move, transport disruption, fire roll call, flagging a requested tool that
overlaps one already licensed, finding devices that have gone quiet, and price
spread across suppliers.

One constraint drove which got which: a planted cluster must be detected in
**both** variants, or `verify-duplicates` reports it as missed in the other.
Only four pairs cleared both thresholds.

### The durable fix: a collision pre-flight

The real failure was not the eleven duplicates, it was that nothing caught them
until `npm run enrich` had spent credit. `npm run seed` now ends with a free,
offline, rarity-weighted word-overlap check over every record pair.

It warns rather than gates, because the resolution is a judgement call.

**What it is not, measured rather than assumed.** Run against the seven declared
clusters with the guard off, the scores spread 0.00 to 0.79 — so it does *not*
separate real duplicates from unrelated records. `dup-a-1`~`dup-a-2` ("Handle
invoice disputes better" / "Sort dispute emails by reason code") scores 0.00
and is unmistakable to an embedding. The threshold flags roughly the top 1% of
pairs and catches exactly one failure mode: a record restated in near-enough
the same words. That happens to be the mistake that produced v4.9's eleven.

The first version of this check was worse and worth recording: plain word
overlap with the title weighted triple, which flagged "Meeting Write-Up
Assistant" against "Procedure Q&A Assistant" and "First Response Drafter"
against "Job Description Drafter". A catalog of automation records is full of
words like drafter, assistant, report and script; their overlap says nothing.
Weighting each word by how rare it is across the corpus fixed it.

It found one more real problem on its first clean run — `gen-mtg-02` against
`gen-mtg-03`, both about weekly meeting preparation, scoring higher than a
declared duplicate pair. `gen-mtg-02` was rewritten.

The one warning left is `sol-dup-a-1` against `sol-dup-a-2`: lexically close
because both are about invoice disputes, semantically apart because one drafts
replies and one sorts an inbox. The embeddings separate them in both variants.
Reviewed, left alone, and noted in the seed file so the next reader does not
re-investigate it.

---

## Open/parked items (not urgent)

- **Design pattern attribute** — Chris's next question: whether classifying a
  record by the SHAPE of what it does (extract, triage, summarise, draft,
  check, route) is worth adding to search and to the AI scan. Deliberately kept
  out of the v4.9 tag expansion so the two do not overlap. Not yet decided.
- **Orientation on a `clear` verdict** — when nothing matches, the page could
  say what the catalog *does* cover instead of only "go ahead". Identified
  during the v4.9 UAT discussion as the other half of the problem that more
  data alone does not solve. Not built.
- The threshold-fragility comment in `scripts/enrich.ts` — now moot;
  `tune-duplicates` replaced the hand-tuning it warned about.
- No other open decisions remain from the addendum — all three items that
  were originally flagged for sign-off (chip set, taxonomy fix, panels
  vs. mindmap) were resolved before Phase 1 started.

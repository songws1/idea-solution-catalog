# Backlog — Addendum A Rollout

**Last updated:** September 8, 2026
**Status:** Phases 1-4.1 complete and verified. v3 build sequence steps 1-3
done; a v4 visual pass and deployment hardening landed on top (see below).
Next in the v3 sequence: step 4 (synthesis prompt).

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

## Next — UX redesign v3 (`docs/ux-redesign-v3.md`)

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
4. **Synthesis prompt** (§3.5) — small, but re-run the §0 Q1/Q2 queries
   and diff rankings/scores to 4 decimal places; a prompt change must not
   move retrieval.
5. **Governance** (§4) — summary tiles, widget reorder, duplicate-cluster
   rework, dot-grid accessibility, table fixes, cross-navigation.
6. **Export** (§5) — smallest, do last.

`npm run verify-duplicates` only needs re-running if `npm run enrich` is
re-run, which none of these steps require.

---

## v4 visual pass + deployment readiness (out of the v3 sequence)

Requested directly after v3 step 3, and deliberately **not** a v3 step: it
changes how the app looks and how it deploys, not what it does. Steps 4-6
above are untouched and still next in the v3 sequence.

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

## After the v3 sequence

- **Mindmap / graph view** (Addendum §2.6) — still its own phase, built
  and reviewed after the v3 work is stable; v3 §7 leaves it unchanged.
- **Solution artifacts** — `Open the artifact` currently points at a
  placeholder `sharepoint.example` URL (a known no-op). Generating real
  artifact files is its own phase; explicitly out of scope for v3 (§7).
  Sequence after the v3 build steps.
- **Employee directory** — the Contact-owner/mailto affordance ships
  inert in v3 (the button exists so the card layout is final; §7 says do
  not wire it here). Explicitly out of scope for v3; sequence after the
  v3 build steps.

---

## Open/parked items (not urgent)

- The threshold-fragility comment in `scripts/enrich.ts` (see above) —
  small documentation addition, do whenever convenient.
- No other open decisions remain from the addendum — all three items that
  were originally flagged for sign-off (chip set, taxonomy fix, panels
  vs. mindmap) were resolved before Phase 1 started.

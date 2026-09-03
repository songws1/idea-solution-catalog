# Backlog — Addendum A Rollout

**Last updated:** September 3, 2026
**Status:** Phases 1-3 complete and verified. Phase 4 is next.

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

## Next — Phase 4: Landing page + filter bar + Kanban (§1, §2.1-2.5)

The largest phase so far. Full prompt is in `docs/cline-build-prompts.md`
— use Plan mode first, this one has real design surface area, not just a
mechanical change.

**Scope reminder before starting:**
- Search bar stays visually dominant; filter bar is secondary.
- Filter bar is ONE unified system (not a separate "intent chip" row —
  that idea was dropped in the addendum's revision): primary chips are
  Service, Solution type, Technology type (now a real field, thanks to
  Phase 3), Org; "more filters" holds Year, Month, Taxonomy, Org.
- Card grid shows solutions primarily; tags are clickable and filter the
  grid (fixes original UAT issue #4).
- Kanban: three columns (Idea / In progress / Solution), clustering by
  the existing cross-reference join, duplicate-candidate indicator
  surfaced (existing data, new UI).
- ONE shared card-detail component used by both the landing grid and
  Kanban cards — not two separate detail UIs. All actions must be real
  (open artifact as a primary button, jump-to-linked-record, clickable
  duplicate candidates) — fixes original UAT issues #5 and #7. Do NOT
  build "flag as reviewed" — explicitly out of scope (no write-back
  store).
- Kanban is the default results view. `ResultsPanels.tsx` and
  `ConnectorLayer.tsx` are retired (not kept as a toggle) — the toggle
  option is the Mindmap view, which is Phase 5, not this phase.

**Before pasting the Cline prompt tomorrow:** tell it to read
`lib/match-label.ts` and `components/search/SearchView.tsx` as they
currently stand (not as Phase 1's original summary described them) —
both changed after that summary was written, per the UAT fix above. Any
new component that shows a match score must reuse `matchLabel()` /
`topScoreOf()` / `hasAnyRealMatch()` from `lib/match-label.ts`, not
reimplement scoring display logic.

---

## After that — Phase 5: Mindmap / graph view (§2.6)

Its own checkpoint, built and reviewed after Kanban is stable — don't
bundle into the same UAT pass as Phase 4. Full spec (nodes/edges/layout,
force-directed via d3-force or equivalent, empty-state handling,
responsive fallback below ~900px) is in `docs/spec-addendum-v2.md` §2.6
and the ready-to-paste prompt is in `docs/cline-build-prompts.md`.

---

## Open/parked items (not urgent)

- The threshold-fragility comment in `scripts/enrich.ts` (see above) —
  small documentation addition, do whenever convenient.
- No other open decisions remain from the addendum — all three items that
  were originally flagged for sign-off (chip set, taxonomy fix, panels
  vs. mindmap) were resolved before Phase 1 started.

# The first measurement of search

**Run date:** September 18, 2026
**Corpus:** `2a0da339e6c0a13c` (post-enrichment, 182 records)
**Command:** `npm run check-gold -- --verbose`
**Result:** 21/35 verdicts correct (60%). Expected records found 100%, shown 96%.

Every number quoted in this project before today came from querying with a
record's own vector. This is the first one that came from sentences a person
wrote. Read the whole page before reacting to the 60%: the headline is the
least useful number on it.

---

## 1. Retrieval is not the problem, and that is the most valuable finding here

**Every expected record was in the top 8 the retriever returned. 100%, 28 of 28
questions that expect anything at all.**

This closes a question that has been open since the RRF experiment. Hybrid
search, better chunking, a larger embedding model, reciprocal rank fusion:
none of them are worth building. There is no retrieval headroom to win, because
retrieval is already finding everything. The RRF measurement said the same
thing from the other direction (94% fused vs 98% post-only), and this confirms
it on real queries rather than self-retrieval.

Anything that makes retrieval "better" from here is effort spent on the one
part of the pipeline that is not broken.

## 2. The thresholds are the problem, and they were calibrated on the wrong distribution

`MIN_ABS_FOR_STRONG` (0.50), `MIN_ABS_FOR_RELATED` (0.30) and
`NO_MATCH_TOPSCORE_FLOOR` (0.30) were set by eye against scores from
record-to-record comparison, where a match scores 0.9 and up. A typed question
is shorter and differently worded than the record it should match, so the whole
distribution compresses. Measured, by expected verdict, using the top score of
each question:

| Expected | n | min | max | all scores |
|---|---|---|---|---|
| exists | 17 | 0.576 | 0.773 | .576 .624 .641 .643 .646 .651 .655 .666 .684 .684 .691 .713 .726 .739 .756 .766 .773 |
| already-asked | 5 | 0.526 | 0.827 | .526 .650 .762 .784 .827 |
| related | 6 | 0.481 | 0.635 | .481 .481 .527 .558 .603 .635 |
| clear | 7 | 0.395 | 0.504 | .395 .403 .422 .467 .501 .502 .504 |

Nothing a human typed scored above 0.83, and the real matches bottom out at
0.526. A 0.50 "strong" floor set against a 0.9-and-up distribution does not
discriminate on a 0.4-to-0.8 one. We knew that floor was weak (3.4% of all
record pairs clear it). Now we know what it does to actual questions.

## 3. The `clear` verdict fails completely

**0 of 7.** Every question whose correct answer is "nothing in the catalog
covers this" returned records instead.

**A correction to the first draft of this page.** It said this was the failure
that causes the duplicate build the catalog exists to prevent. That is wrong,
and worth stating plainly because the mistake points the wrong way. A false
`clear` is what causes a duplicate build: it tells someone nothing exists, and
they go and build it. Today the system never says `clear` at all, so it cannot
currently make that error. What 0/7 actually costs is different, and still
serious:

- Two of the seven (q26, q27) came back `already-asked`, which states that a
  colleague has requested something nobody requested. That is not a weak answer,
  it is a false one about a specific person's work.
- A verdict that never clears anyone carries no information. A check that always
  finds something is a check people stop reading, and then it fails at the one
  moment it had something real to say.

The direction of the risk matters for the fix. Raising the floor is what
*introduces* the duplicate-build error, so the tuning should prefer the low end
of any plateau and must not buy `clear` accuracy by giving up `exists`.

The cause is arithmetic, not judgment. The "is there anything here at all"
floor is 0.30, and unrelated questions score between 0.395 and 0.504. Every one
of them clears 0.30 comfortably.

**Where the line actually falls.** Sweeping a single floor over the 35
questions, scoring only "did it correctly decide whether anything is here":

| Floor | clear questions right | non-clear questions right | total |
|---|---|---|---|
| 0.30 (today) | 0/7 | 28/28 | 28/35 |
| 0.48 | 4/7 | 28/28 | 32/35 |
| 0.50 | 4/7 | 26/28 | 30/35 |
| **0.51** | **7/7** | **26/28** | **33/35** |
| 0.52 | 7/7 | 26/28 | 33/35 |
| 0.53 | 7/7 | 24/28 | 31/35 |

0.51 to 0.52 is the plateau. The two questions it costs are q24 and q34, both
`related`, both at 0.481.

**The honest caveat.** The highest `clear` question is 0.504 and the lowest
real match is 0.526. That is a 0.022 margin, derived from 7 negative examples.
It is a hypothesis, not a law. This project already ships one threshold with a
0.0002 margin (`verify-duplicates`), but that one was derived from 6 planted
clusters with known ground truth, and it is checked on every regeneration.
A threshold set here should be treated as provisional until the gold set is
larger or a second corpus confirms it.

## 4. `exists` vs `already-asked` confusion is a different problem

Four questions got the right records and the wrong label: q02 and q11 expected
`already-asked` and got `exists`; q13 and q23 expected `exists` and got
`already-asked`.

No threshold fixes these. The verdict picks between the panels by which side
scores higher, so when a solution and an unsolved idea both describe the same
work, the label follows a score difference that carries no meaning. This is a
rule problem in `lib/overlap.ts`, not a calibration problem, and it should be
looked at separately and after the thresholds.

## 5. The `related` boundary may not be separable at all

After moving the two 0.481 questions into `clear`, the remaining `related`
questions score .527 .558 .603 .635. The `exists` and `already-asked`
questions start at 0.526. The ranges overlap completely.

That may be a real property of the problem rather than a tuning failure:
"related but not the same thing" is a judgment two people can disagree about,
and six examples is too few to draw a line from. Do not force this one. If the
sweep cannot separate `related` cleanly, the right answer is to accept it and
say so, not to pick a number that scores well on six questions.

---

## 6. The sweep ran, and the answer came with a constraint nobody had written down

`npm run tune-gold` against the real vectors, September 18:

| | today | best on total | best under the guard |
|---|---|---|---|
| score | 21/35 | 27/35 | 27/35 |
| exists | 15/17 | 14/17 | 16/17 |
| already-asked | 3/5 | 4/5 | 3/5 |
| related | 3/6 | 2/6 | 1/6 |
| clear | 0/7 | 7/7 | 7/7 |

The floor that decides "is anything here at all" lands at **0.51 to 0.52**,
which is what the top-score analysis in section 3 predicted before the sweep
was written. The whole gain comes from `clear` going 0 to 7. The cost is two
`related` questions (q24, q34, both at 0.481) becoming `clear` — a lost
discovery, not a lost duplicate-prevention, since `related` never told anyone to
stop building.

**The constraint, found by trying the recommendation rather than trusting it.**
The first sweep treated the three constants as three free knobs and recommended
a noise gate of 0.52 with `MIN_ABS_FOR_RELATED` left at 0.30. Applying that
fails `check-scale` on sight:

```
FAIL the verdict always matches the zone of the highest dot that can set it
     — idea-0001@0.32 dots say related, verdict clear
```

The similarity scale draws `MIN_ABS_FOR_RELATED` as the line between "nothing
here" and "related", so lifting the noise gate above it puts dots inside the
Related band on a page whose verdict says nothing is close. The picture and the
words contradict each other, which is the precise failure v4.14's check was
built to catch. Tying the two and raising both then fails a second way, with
`related` above `strong` and the `related` verdict left with no band to live in
("every verdict was exercised — related 0").

So these are not three numbers. They are **one floor used in two places, and a
ceiling strictly above it.** That is now written in `lib/match-label.ts`, and
`tune-gold` sweeps two dimensions instead of three, so it can no longer
recommend a setting the product cannot adopt. A tuner that emits an unusable
number is worse than no tuner, because its output looks like evidence.

**This invalidated the 27/35 above.** That figure came from the unconstrained
sweep. The constrained re-run came in at 25/35, lower as expected, because the
coupling forces `strong` above the floor and `strong` is the knob that costs
`exists`.

## 7. Adopted (v4.19): floor 0.52, strong 0.54

| | before | after |
|---|---|---|
| total | 21/35 | **25/35** |
| exists | 15/17 | 15/17 |
| already-asked | 3/5 | 3/5 |
| related | 3/6 | **0/6** |
| clear | **0/7** | **7/7** |

`NO_MATCH_TOPSCORE_FLOOR` 0.30 → 0.52, `MIN_ABS_FOR_RELATED` 0.30 → 0.52,
`MIN_ABS_FOR_STRONG` 0.50 → 0.54. Decided by Chris after seeing the trade
stated, not by the script.

**What was bought:** the `clear` verdict, which did not work at all. A pre-build
check that can never say "nothing exists, go ahead" has no green light, and the
green light is half of what the page is for.

**What was sold, and it is not small:** `related` goes to 0 of 6. Two of those
questions (q24, q34, both topping out at 0.481) now read as `clear`, which is
the false-clear direction and therefore the duplicate-build direction. The other
one moves up into `exists`.

**Why no setting avoids this.** Lay the four distributions on one axis:

```
clear     0.395 ────────── 0.504
related        0.481 ──────────────── 0.635
exists                     0.576 ──────────── 0.773
```

`related` overlaps both of its neighbours. Its floor is under `clear`'s ceiling
and its ceiling is over `exists`'s floor. **No absolute band can hold it at any
setting**, and no larger gold set will change that, because "related but not the
same thing" is a semantic judgment and this is a magnitude scale. The 0.02-wide
band the calibration leaves behind is an acceptance of that fact, not a tuning
result.

The open design question, deliberately not answered here: whether `related`
should remain a verdict at all, or whether those cases belong under `clear` with
the v4.10 "nearest, not a match" line, which already does that job in prose.
Three verdicts would be separable; four are not.

**Two consequences that had to be fixed in the same change**, both of them the
thin band showing up somewhere else:

- The similarity scale drew a `related` zone 14 pixels wide on a 720-pixel
  axis, and its label would have spilled across the `strong` zone — a word
  pointing at the wrong band. A zone too narrow for its name now keeps its
  boundary value and drops the word, and `check-scale` asserts no label
  overflows the zone it names.
- `check-scale`'s "every verdict was exercised" assertion started passing on
  luck: `related` appeared **once** in 910 queries. One regeneration away from
  failing for a reason unconnected to any bug. The run now aims a dilution
  search into the band deliberately (32 hits, on every sixth record) and asserts
  the band is reachable on purpose.

**Provisional, by the script's own warning.** Six settings reached the maximum,
which is a narrow plateau. The second decimal should not be trusted until the
gold set is larger.

## What this says to do next

1. **`scripts/tune-gold.ts`** — built (v4.18). `npm run tune-gold` sweeps the
   floors against the gold set and prints accuracy at each setting, the same way
   `tune-duplicates` derives the duplicate threshold from planted clusters
   rather than from taste. The analysis above uses each question's single top
   score as a proxy; the verdict actually compares the top *solution* score
   against the top *unsolved idea* score, so the sweep works on the per-panel
   scores and may land somewhere different from 0.51. Three things make its
   recommendation trustworthy rather than merely optimal:
   - it sweeps the **real** `assessOverlap`, which now takes the thresholds as a
     parameter, so the recommendation applies to the rule the page follows and
     not to a tuner's copy of it;
   - it reports the **width of the winning plateau**. A maximum reached by one
     setting is a number fitted to 35 questions; a maximum reached by a broad
     region is a boundary. It recommends the middle, not the edge;
   - it **does not move a floor that does not need to move**. The floors overlap
     in effect, so a plateau is usually wide in at least one dimension, and the
     centre of a dimension that does not matter is an invented number. Each
     floor is checked alone and today's value is kept when it still reaches the
     maximum.
2. **Move the floors**, guarded — done in v4.19, section 7 above.
3. **Then** re-examine the `exists` / `already-asked` rule in `lib/overlap.ts`.
   Four questions (q02, q11, q13, q23) find the right records and choose the
   wrong label. No threshold touches this.
4. **Decide what `related` is for**, given that it cannot be a score band.
5. **Not** retrieval work. See finding 1.

## What this does not say

The gold set is 35 questions against 182 synthetic records. It is enough to
show that the `clear` verdict is broken, because 0/7 is not a sampling
artefact. It is not enough to fix a boundary to three decimal places, and it
says nothing about how any of this behaves on a real corpus of real requests.
The fingerprint guard in `lib/gold.ts` exists so that the second point cannot
be quietly forgotten when this tool meets real data.

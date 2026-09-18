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

## 3. The `clear` verdict fails completely, and that is the expensive one

**0 of 7.** Every question whose correct answer is "nothing in the catalog
covers this" returned records instead.

This is the failure that matters most, because it is the one that causes the
duplicate build the catalog exists to prevent, and it does it while sounding
authoritative. Two of the seven (q26, q27) came back `already-asked`, which
tells someone that a colleague has already requested a thing nobody requested.

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

## What this says to do next

1. **`scripts/tune-gold.ts`** — sweep the floors against the gold set and print
   accuracy at each setting, the same way `tune-duplicates` derives the
   duplicate threshold from planted clusters rather than from taste. The
   analysis above uses each question's single top score as a proxy; the verdict
   actually compares the top *solution* score against the top *unsolved idea*
   score, so the sweep has to work on the per-panel scores and may land
   somewhere slightly different from 0.51.
2. **Move the floors**, guarded: only adopt a change that takes `clear` to at
   least 6/7 without dropping `exists` below its current 15/17, and prefer a
   round number. A floor of 0.5137 that beats 0.51 by one question is noise
   wearing a lab coat.
3. **Then** re-examine the `exists` / `already-asked` rule in `lib/overlap.ts`.
4. **Not** retrieval work. See finding 1.

## What this does not say

The gold set is 35 questions against 182 synthetic records. It is enough to
show that the `clear` verdict is broken, because 0/7 is not a sampling
artefact. It is not enough to fix a boundary to three decimal places, and it
says nothing about how any of this behaves on a real corpus of real requests.
The fingerprint guard in `lib/gold.ts` exists so that the second point cannot
be quietly forgotten when this tool meets real data.

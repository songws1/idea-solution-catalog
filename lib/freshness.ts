import type { IdeaRecord, SolutionRecord } from "./types";

/**
 * How much a record can still be trusted (v4.8).
 *
 * Research on internal catalogs says the thing that kills them is not weak
 * search, it is staleness: the catalog describes the world as of the last time
 * someone updated it, people start finding entries that are no longer true, and
 * it quietly loses authority. That failure is specific to this product, because
 * the whole page rests on one sentence — "this already exists, go and get it".
 * If the record behind that sentence is two years old and nobody has confirmed
 * it still runs, the catalog does not merely fail to help; it sends someone
 * down a path that wastes more time than building would have.
 *
 * So freshness is graded against the field that actually means "somebody
 * checked": `date_last_reviewed` for a built solution, not `date_built`. A
 * solution built fifteen months ago and reviewed last month is in better shape
 * than one built six months ago that nobody has looked at since.
 *
 * Two vocabularies, deliberately. A solution goes STALE (it may no longer
 * work). An unsolved idea goes DORMANT (it still describes a real want; nobody
 * picked it up). Collapsing them into one word would lose the difference that
 * decides what the reader does next.
 *
 * Everything here is a pure function of a date and `now`, so the UI, the
 * governance math and the offline checks all grade on one scale.
 */

/** Solutions, by time since the last review. */
export type SolutionFreshness = "current" | "aging" | "stale" | "unreviewed";

/** Unsolved ideas, by time since they were asked for. */
export type IdeaFreshness = "current" | "waiting" | "dormant";

/**
 * Thresholds in months. lib/aging.ts grades the governance tables against
 * these same numbers, so a card that says "unchecked 13mo" and the dashboard
 * row that counts it land in the same bucket. Two scales would eventually
 * disagree in front of a reviewer, and the dashboard exists to be trusted.
 *
 * They replaced 30/90-day buckets, which were miscalibrated for a catalog on
 * this clock: 37 of 40 unsolved ideas and 20 of 25 solutions fell in one
 * bucket, so the widget drew a single bar and said nothing. Trust decays more
 * slowly than operational responsiveness — a solution reviewed four months ago
 * is entirely trustworthy, and calling it aging would cry wolf on most of the
 * catalog.
 */
export const SOLUTION_AGING_MONTHS = 6;
export const SOLUTION_STALE_MONTHS = 12;
export const IDEA_WAITING_MONTHS = 6;
export const IDEA_DORMANT_MONTHS = 12;

/** Local, not imported from lib/aging.ts: aging imports these thresholds, so
    taking DAY_MS back the other way would make the two modules circular. */
const DAY_MS = 86_400_000;
const MONTH_MS = 30.44 * DAY_MS;

export function monthsSince(dateIso: string | null, now: Date = new Date()): number | null {
  if (!dateIso) return null;
  const then = new Date(dateIso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, (now.getTime() - then) / MONTH_MS);
}

export function solutionFreshness(
  sol: Pick<SolutionRecord, "date_last_reviewed">,
  now: Date = new Date()
): SolutionFreshness {
  const months = monthsSince(sol.date_last_reviewed, now);
  if (months === null) return "unreviewed";
  if (months >= SOLUTION_STALE_MONTHS) return "stale";
  if (months >= SOLUTION_AGING_MONTHS) return "aging";
  return "current";
}

export function ideaFreshness(
  idea: Pick<IdeaRecord, "submitted_date">,
  now: Date = new Date()
): IdeaFreshness {
  const months = monthsSince(idea.submitted_date, now) ?? 0;
  if (months >= IDEA_DORMANT_MONTHS) return "dormant";
  if (months >= IDEA_WAITING_MONTHS) return "waiting";
  return "current";
}

/** True when the state is worth saying anything about at all. */
export function isNoteworthy(state: SolutionFreshness | IdeaFreshness): boolean {
  return state !== "current";
}

/**
 * True when the state earns a mark on a BOARD CARD, which is a stricter bar
 * than isNoteworthy.
 *
 * Caught in review: marking everything non-current put a pill on 40 of 65
 * cards. At that density the mark stops being a signal and becomes part of the
 * card template, which is the opposite of the intent, and it undoes two rounds
 * of density work on this board.
 *
 * The middle tiers are the ones to drop. `aging` says "probably fine" and
 * `waiting` says "still open", and a mark whose own sentence is "probably
 * fine" is noise by definition. What survives is the states that change what
 * the reader should do: nobody has vouched for this build (`stale`,
 * `unreviewed`), or this request has been sitting over a year (`dormant`).
 *
 * The middle tiers are not lost — the drawer still states them, and the
 * governance tables still count them. The card is a scanning surface and the
 * drawer is a reading surface, so they get different bars.
 */
export function isCardWorthy(state: SolutionFreshness | IdeaFreshness): boolean {
  return state === "stale" || state === "unreviewed" || state === "dormant";
}

/** Short mark for a card. Empty for `current` — see isNoteworthy. */
export function freshnessMark(
  state: SolutionFreshness | IdeaFreshness,
  months: number | null
): string {
  const n = months === null ? null : Math.round(months);
  switch (state) {
    case "unreviewed":
      return "never reviewed";
    case "stale":
      return `unchecked ${n}mo`;
    case "aging":
      return `unchecked ${n}mo`;
    case "dormant":
      return `waiting ${n}mo`;
    case "waiting":
      return `waiting ${n}mo`;
    default:
      return "";
  }
}

/**
 * A full sentence for the detail drawer, where there is room to say what the
 * mark on the card meant and what to do about it. A state with no consequence
 * attached is just a colour.
 */
export function freshnessSentence(
  state: SolutionFreshness | IdeaFreshness,
  months: number | null
): string | null {
  const n = months === null ? null : Math.round(months);
  switch (state) {
    case "unreviewed":
      return "Nobody has confirmed this still works since it was built. Ask the owner before you rely on it.";
    case "stale":
      return `Last confirmed working ${n} months ago. Treat what it does as a starting point and check with the owner before you rely on it.`;
    case "aging":
      return `Last confirmed working ${n} months ago. Probably fine, but worth a word with the owner if you are going to depend on it.`;
    case "dormant":
      return `Asked for ${n} months ago and still not built. Adding your case may be what moves it, but do not assume it is coming.`;
    case "waiting":
      return `Asked for ${n} months ago and still open.`;
    default:
      return null;
  }
}

/** CSS modifier for the mark, so the tiers read at a glance without a legend. */
export function freshnessClass(state: SolutionFreshness | IdeaFreshness): string {
  switch (state) {
    case "stale":
    case "unreviewed":
      return "f-stale";
    case "dormant":
      return "f-dormant";
    case "aging":
    case "waiting":
      return "f-aging";
    default:
      return "";
  }
}

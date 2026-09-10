import {
  IDEA_DORMANT_MONTHS,
  IDEA_WAITING_MONTHS,
  SOLUTION_AGING_MONTHS,
  SOLUTION_STALE_MONTHS,
} from "./freshness";

export const DAY_MS = 86_400_000;

/**
 * Age buckets for the governance tables (v3 §4.4).
 *
 * These were 30/90 days until v4.8. On a catalog whose records span two years
 * that put 37 of 40 unsolved ideas and 20 of 25 solutions in a single bucket,
 * so the widget rendered one full column and two empty ones and told a reviewer
 * nothing they did not already know.
 *
 * The boundaries now come from lib/freshness.ts, the same thresholds that
 * decide whether a board card carries a trust mark. That matters more than the
 * exact numbers: a reviewer who sees "3 solutions over 12 months" on the
 * dashboard and then opens the board should find exactly those three carrying a
 * mark. Two independently-tuned scales would drift apart and quietly discredit
 * both views.
 */
export type AgingBucket =
  | "under 6 months"
  | "6 to 12 months"
  | "over 12 months"
  | "never reviewed";

export function daysSince(dateIso: string, now: Date = new Date()): number {
  const then = new Date(dateIso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((now.getTime() - then) / DAY_MS));
}

const AVG_MONTH_DAYS = 30.44;

/**
 * Ideas and solutions grade on the same boundaries today (6 and 12 months).
 * They are still read from two named pairs of constants rather than one, so
 * that a future decision to move one — an idea's wait and a solution's review
 * cycle are not the same kind of clock — does not silently move the other.
 */
export function agingBucket(days: number, kind: "idea" | "solution" = "solution"): AgingBucket {
  const months = days / AVG_MONTH_DAYS;
  const [mid, old] =
    kind === "idea"
      ? [IDEA_WAITING_MONTHS, IDEA_DORMANT_MONTHS]
      : [SOLUTION_AGING_MONTHS, SOLUTION_STALE_MONTHS];
  if (months < mid) return "under 6 months";
  if (months < old) return "6 to 12 months";
  return "over 12 months";
}

/** Ideas: how long they have sat since submission (proxy for time in status — the portal has no status-change date). */
export function ideaAgeDays(submittedDate: string, now: Date = new Date()): number {
  return daysSince(submittedDate, now);
}

/** Solutions: time since date_last_reviewed; null means never reviewed. */
export function solutionReviewAgeDays(
  dateLastReviewed: string | null,
  now: Date = new Date()
): number | null {
  if (!dateLastReviewed) return null;
  return daysSince(dateLastReviewed, now);
}

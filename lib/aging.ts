export const DAY_MS = 86_400_000;

export type AgingBucket = "under 30 days" | "30 to 90 days" | "over 90 days" | "never reviewed";

export function daysSince(dateIso: string, now: Date = new Date()): number {
  const then = new Date(dateIso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((now.getTime() - then) / DAY_MS));
}

export function agingBucket(days: number): AgingBucket {
  if (days < 30) return "under 30 days";
  if (days < 90) return "30 to 90 days";
  return "over 90 days";
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

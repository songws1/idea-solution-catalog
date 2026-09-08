/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Why this exists: /api/search spends real OpenRouter credit on every call
 * (one embedding + one chat completion). On a public deployment the URL is the
 * only thing standing between a stranger and that spend, so the route caps how
 * often any one client can trigger it.
 *
 * Scope and limits, stated plainly so nobody mistakes this for a security
 * boundary: state lives in the module scope of a single serverless instance, so
 * the ceiling is per-instance, resets on cold start, and is not shared across
 * concurrent instances. It stops casual hammering and accidental loops. It does
 * not stop a determined distributed abuser — for that, put the deployment
 * behind Vercel Deployment Protection (see README) or a real edge rate limiter.
 */

type Hit = { count: number; windowStart: number };

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const MAX_TRACKED_CLIENTS = 5_000;

const hits = new Map<string, Hit>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Best-effort client identity. Behind Vercel the first entry of
 * x-forwarded-for is the real client; the header is spoofable, which is
 * acceptable for a spend guard and is not relied on for anything else.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function checkRateLimit(key: string, now = Date.now()): RateLimitResult {
  // Cheap guard against unbounded growth on a long-lived warm instance.
  if (hits.size > MAX_TRACKED_CLIENTS) {
    for (const [k, hit] of hits) {
      if (now - hit.windowStart > WINDOW_MS) hits.delete(k);
    }
    if (hits.size > MAX_TRACKED_CLIENTS) hits.clear();
  }

  const existing = hits.get(key);

  if (!existing || now - existing.windowStart >= WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: MAX_PER_WINDOW - 1,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= MAX_PER_WINDOW) {
    const elapsed = now - existing.windowStart;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((WINDOW_MS - elapsed) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: MAX_PER_WINDOW - existing.count,
    retryAfterSeconds: 0,
  };
}

export const RATE_LIMIT = { WINDOW_MS, MAX_PER_WINDOW } as const;

/** Test seam — resets the window store. */
export function __resetRateLimit(): void {
  hits.clear();
}

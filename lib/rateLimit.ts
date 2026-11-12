/**
 * Fixed-window, in-memory rate limiter.
 *
 * Best effort: on serverless each instance keeps its own counters, which is enough to slow down
 * passcode guessing for a demo app. Swap for a shared store (e.g. Upstash Redis) for multi-region production.
 */
type Window = { count: number; resetAt: number };

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const windows = new Map<string, Window>();

  return {
    check(key: string, now: number = Date.now()): RateLimitResult {
      // Opportunistic cleanup keeps memory bounded.
      if (windows.size > 5_000) for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);

      const w = windows.get(key);
      if (!w || w.resetAt <= now) {
        windows.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
      }
      w.count++;
      const allowed = w.count <= limit;
      return { allowed, remaining: Math.max(0, limit - w.count), retryAfterSeconds: allowed ? 0 : Math.ceil((w.resetAt - now) / 1000) };
    },
    reset(key: string) {
      windows.delete(key);
    },
  };
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

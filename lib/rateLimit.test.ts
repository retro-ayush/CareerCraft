import { describe, expect, it } from "vitest";
import { clientIp, createRateLimiter } from "./rateLimit";

describe("createRateLimiter", () => {
  it("allows up to the limit, then blocks with a retry time", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });
    const t = 1_000;
    expect([1, 2, 3].map(() => limiter.check("ip", t).allowed)).toEqual([true, true, true]);
    const blocked = limiter.check("ip", t + 10_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(50);
  });
  it("starts a new window after it expires", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000 });
    limiter.check("ip", 0);
    expect(limiter.check("ip", 500).allowed).toBe(false);
    expect(limiter.check("ip", 1_000).allowed).toBe(true);
  });
  it("tracks keys independently and can be reset", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    limiter.check("a", 0);
    expect(limiter.check("b", 0).allowed).toBe(true);
    limiter.reset("a");
    expect(limiter.check("a", 0).allowed).toBe(true);
  });
});

describe("clientIp", () => {
  it("takes the first x-forwarded-for address", () => {
    expect(clientIp(new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } }))).toBe("1.2.3.4");
  });
  it("falls back to unknown", () => {
    expect(clientIp(new Request("http://x"))).toBe("unknown");
  });
});

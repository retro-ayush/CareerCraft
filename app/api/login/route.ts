import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken, passcodeMatches } from "@/lib/auth";
import { handle, parseBody } from "@/lib/http";
import { logger } from "@/lib/logger";
import { clientIp, createRateLimiter } from "@/lib/rateLimit";
import { loginSchema } from "@/lib/schemas";

export const runtime = "nodejs";

/** 10 attempts per IP per 10 minutes slows down passcode guessing. */
const limiter = createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 });

/** POST /api/login  body: { passcode } -> sets a signed, expiring, httpOnly session cookie. */
export const POST = handle("auth.login", async (request) => {
  const expected = process.env.APP_PASSCODE?.trim();
  if (!expected) return NextResponse.json({ error: "APP_PASSCODE is not set on the server." }, { status: 500 });

  const ip = clientIp(request);
  const rate = limiter.check(ip);
  if (!rate.allowed) {
    logger.warn("login_rate_limited", { ip });
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil(rate.retryAfterSeconds / 60)} minute(s).` },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  const { passcode } = await parseBody(request, loginSchema);
  if (!(await passcodeMatches(passcode, expected))) {
    return NextResponse.json({ error: "Wrong passcode." }, { status: 401 });
  }

  limiter.reset(ip);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
});

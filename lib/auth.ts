/**
 * Passcode-gated sessions.
 *
 * The session cookie is a signed, expiring token: `v1.<expiresAtMs>.<hmac>`, where the HMAC-SHA256 key is
 * derived from APP_PASSCODE. The passcode itself is never stored in the cookie, a token cannot be forged
 * without the passcode, it expires on its own, and rotating the passcode invalidates every session.
 *
 * Runs in both the proxy (edge runtime) and route handlers, so it only uses Web Crypto.
 */
export const SESSION_COOKIE = "app_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

const TOKEN_VERSION = "v1";
const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(`careercraft-session:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

async function sign(payload: string, secret: string): Promise<string> {
  return toHex(await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(payload)));
}

async function sha256(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

/** Constant-time string comparison (avoids leaking how many leading characters matched). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Compares a submitted passcode with the expected one without a timing side channel. */
export async function passcodeMatches(submitted: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256(submitted.trim()), sha256(expected)]);
  return safeEqual(a, b);
}

export async function createSessionToken(secret: string, now: number = Date.now()): Promise<string> {
  const expiresAt = now + SESSION_TTL_SECONDS * 1000;
  const payload = `${TOKEN_VERSION}.${expiresAt}`;
  return `${payload}.${await sign(payload, secret)}`;
}

/** True when the token is well formed, unexpired and signed with `secret`. */
export async function verifySessionToken(token: string | undefined, secret: string | undefined, now: number = Date.now()): Promise<boolean> {
  if (!token || !secret) return false;
  const [version, expiresAt, signature] = token.split(".");
  if (version !== TOKEN_VERSION || !expiresAt || !signature) return false;
  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || expiry <= now) return false;
  return safeEqual(signature, await sign(`${version}.${expiresAt}`, secret));
}

/** Session check used by proxy.ts. */
export async function isValidSession(cookieValue: string | undefined): Promise<boolean> {
  return verifySessionToken(cookieValue, process.env.APP_PASSCODE?.trim());
}

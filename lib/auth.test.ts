import { describe, expect, it } from "vitest";
import { SESSION_TTL_SECONDS, createSessionToken, passcodeMatches, safeEqual, verifySessionToken } from "./auth";

const SECRET = "team-passcode";
const NOW = 1_800_000_000_000;

describe("session tokens", () => {
  it("accepts a fresh token signed with the same secret", async () => {
    const token = await createSessionToken(SECRET, NOW);
    expect(await verifySessionToken(token, SECRET, NOW + 1000)).toBe(true);
  });
  it("never contains the passcode", async () => {
    expect(await createSessionToken(SECRET, NOW)).not.toContain(SECRET);
  });
  it("rejects an expired token", async () => {
    const token = await createSessionToken(SECRET, NOW);
    expect(await verifySessionToken(token, SECRET, NOW + SESSION_TTL_SECONDS * 1000 + 1)).toBe(false);
  });
  it("rejects a token signed with a different secret (passcode rotated)", async () => {
    const token = await createSessionToken(SECRET, NOW);
    expect(await verifySessionToken(token, "new-passcode", NOW)).toBe(false);
  });
  it("rejects a token whose expiry was tampered with", async () => {
    const [v, , sig] = (await createSessionToken(SECRET, NOW)).split(".");
    expect(await verifySessionToken(`${v}.${NOW + 10 ** 12}.${sig}`, SECRET, NOW)).toBe(false);
  });
  it.each([undefined, "", "garbage", "v1.abc.def", "v2.1.2"])("rejects malformed token %s", async (token) => {
    expect(await verifySessionToken(token, SECRET, NOW)).toBe(false);
  });
  it("rejects everything when no secret is configured", async () => {
    expect(await verifySessionToken(await createSessionToken(SECRET, NOW), undefined, NOW)).toBe(false);
  });
});

describe("passcode comparison", () => {
  it("matches the right passcode, trimming input", async () => {
    expect(await passcodeMatches("  team-passcode ", SECRET)).toBe(true);
    expect(await passcodeMatches("team-passcodE", SECRET)).toBe(false);
  });
  it("safeEqual compares strings exactly", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

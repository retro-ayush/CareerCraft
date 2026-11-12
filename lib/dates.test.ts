import { describe, expect, it } from "vitest";
import { daysBetween, todayInIndia, weekdayInIndia } from "./dates";

describe("dates", () => {
  it("counts whole calendar days, negative for the past", () => {
    expect(daysBetween("2026-11-12", "2026-11-19")).toBe(7);
    expect(daysBetween("2026-11-12", "2026-11-12")).toBe(0);
    expect(daysBetween("2026-11-12", "2026-11-10")).toBe(-2);
  });
  it("crosses month and year boundaries", () => {
    expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
  });
  it("uses India time: 20:00 UTC is already the next day in IST", () => {
    const lateUtc = new Date("2026-11-12T20:00:00Z"); // 01:30 IST on 13 Nov
    expect(todayInIndia(lateUtc)).toBe("2026-11-13");
    expect(weekdayInIndia(lateUtc)).toBe("Friday");
  });
});

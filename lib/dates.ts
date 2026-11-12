/** All business dates are evaluated in India time (the deadlines in the data are IST calendar dates). */
const TIME_ZONE = "Asia/Kolkata";
const MS_PER_DAY = 86_400_000;

/** Today's date in India as YYYY-MM-DD. */
export function todayInIndia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

/** Today's weekday in India, e.g. "Thursday". Used in the system prompt so "tomorrow" works. */
export function weekdayInIndia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone: TIME_ZONE, weekday: "long" }).format(now);
}

/** Whole calendar days from `fromIso` to `toIso` (both YYYY-MM-DD). Negative if `toIso` is earlier. */
export function daysBetween(fromIso: string, toIso: string): number {
  const ms = Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`);
  return Math.round(ms / MS_PER_DAY);
}

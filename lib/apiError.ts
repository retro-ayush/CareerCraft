import { NextResponse } from "next/server";

/** Turns any error into a JSON response the pages can show. */
export function apiError(err: unknown, status = 500) {
  const message =
    err instanceof Error ? err.message : typeof err === "object" && err && "message" in err ? String(err.message) : "Request failed";
  const hint = /schema cache|does not exist/i.test(message)
    ? " Run seed/ps6_job_match.sql and seed/ps6_careermatch_extras.sql in the Supabase SQL Editor."
    : "";
  const notFound = /not in your shortlist|No job found/i.test(message);
  return NextResponse.json({ error: message + hint }, { status: notFound ? 404 : status });
}

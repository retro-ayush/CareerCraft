import { NextResponse } from "next/server";
import { evaluateJob, filterJobs, getOpenJobs, getProfile, rankMatches } from "@/lib/careermatch";
import { todayInIndia } from "@/lib/dates";
import { handle, parseQuery } from "@/lib/http";
import { jobQuerySchema } from "@/lib/schemas";

export const runtime = "nodejs";

/** GET /api/jobs?city=&q=&job_type=&work_mode= -> open jobs scored for the student, eligible first. */
export const GET = handle("jobs.list", async (request) => {
  const { city, q, job_type, work_mode } = parseQuery(request, jobQuerySchema, "Invalid filters");
  const [profile, jobs] = await Promise.all([getProfile(), getOpenJobs()]);
  const today = todayInIndia();
  const matches = filterJobs(jobs, { city, keyword: q, job_type, work_mode }).map((j) => evaluateJob(j, profile, undefined, today));
  return NextResponse.json({ jobs: rankMatches(matches) });
});

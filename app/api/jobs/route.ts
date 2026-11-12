import { NextResponse } from "next/server";
import { evaluateJob, filterJobs, getOpenJobs, getProfile, rankMatches } from "@/lib/careermatch";
import { jobQuerySchema } from "@/lib/schemas";
import { apiError } from "@/lib/apiError";

export const runtime = "nodejs";

/** GET /api/jobs?city=&q=&job_type=&work_mode= -> open jobs scored for the student (eligible first) */
export async function GET(request: Request) {
  const params = Object.fromEntries(
    [...new URL(request.url).searchParams.entries()].filter(([, v]) => v.trim() !== "")
  );
  const parsed = jobQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid filters", details: parsed.error.issues }, { status: 400 });
  }
  try {
    const [profile, jobs] = await Promise.all([getProfile(), getOpenJobs()]);
    const { city, q, job_type, work_mode } = parsed.data;
    const matches = rankMatches(filterJobs(jobs, { city, keyword: q, job_type, work_mode }).map((j) => evaluateJob(j, profile)));
    return NextResponse.json({ jobs: matches });
  } catch (err) {
    return apiError(err);
  }
}

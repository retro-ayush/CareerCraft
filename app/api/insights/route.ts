import { NextResponse } from "next/server";
import { buildSkillGapPlan, countStrongMatches, evaluateJob, getOpenJobs, getProfile } from "@/lib/careermatch";
import { apiError } from "@/lib/apiError";

export const runtime = "nodejs";

/** GET /api/insights -> dashboard numbers + Skill ROI plan for the student */
export async function GET() {
  try {
    const [profile, jobs] = await Promise.all([getProfile(), getOpenJobs()]);
    const matches = jobs.map((j) => evaluateJob(j, profile));
    const eligible = matches.filter((m) => m.eligible);
    return NextResponse.json({
      open_jobs: jobs.length,
      eligible_jobs: eligible.length,
      strong_matches: countStrongMatches(jobs, profile),
      closing_this_week: eligible.filter((m) => m.days_left <= 7 && m.match_score >= 50).length,
      skill_plan: buildSkillGapPlan(jobs, profile, 6),
    });
  } catch (err) {
    return apiError(err);
  }
}

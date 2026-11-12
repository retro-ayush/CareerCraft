import { NextResponse } from "next/server";
import { buildSkillGapPlan, evaluateJob, getOpenJobs, getProfile } from "@/lib/careermatch";
import { CLOSING_SOON_DAYS, GOOD_FIT_SCORE } from "@/lib/constants";
import { todayInIndia } from "@/lib/dates";
import { handle } from "@/lib/http";
import { isStrongMatch } from "@/lib/scoring";
import type { Insights } from "@/lib/types";

export const runtime = "nodejs";

const SKILL_PLAN_SIZE = 6;

/** GET /api/insights -> dashboard numbers and the Skill ROI plan for the student. */
export const GET = handle("insights.get", async () => {
  const [profile, jobs] = await Promise.all([getProfile(), getOpenJobs()]);
  const today = todayInIndia();
  const eligible = jobs.map((j) => evaluateJob(j, profile, undefined, today)).filter((m) => m.eligible);

  const body: Insights = {
    open_jobs: jobs.length,
    eligible_jobs: eligible.length,
    strong_matches: eligible.filter(isStrongMatch).length,
    closing_this_week: eligible.filter((m) => m.days_left <= CLOSING_SOON_DAYS && m.match_score >= GOOD_FIT_SCORE).length,
    skill_plan: buildSkillGapPlan(jobs, profile, SKILL_PLAN_SIZE, today),
  };
  return NextResponse.json(body);
});

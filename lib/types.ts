/**
 * Domain types shared by API routes, agent tools and the UI.
 * Type-only module: safe to import from client components.
 */
import type { APPLICATION_STATUSES, JOB_TYPES, WORK_MODES } from "./constants";

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type JobType = (typeof JOB_TYPES)[number];
export type WorkMode = (typeof WORK_MODES)[number];

export type Profile = {
  id: string;
  name: string;
  degree: string;
  branch: string;
  grad_year: number;
  cgpa: number;
  preferred_cities: string[];
  skills: string[];
  interests: string | null;
};

export type Job = {
  id: number;
  title: string;
  company: string;
  city: string;
  work_mode: WorkMode;
  job_type: JobType;
  min_cgpa: number;
  eligible_branches: string[];
  required_skills: string[];
  nice_to_have: string[];
  salary_lpa_min: number | null;
  salary_lpa_max: number | null;
  apply_by: string;
  description: string;
};

/** A job evaluated against a student's profile: eligibility, score and skill gaps. */
export type JobMatch = {
  job_id: number;
  title: string;
  company: string;
  city: string;
  work_mode: string;
  job_type: string;
  salary_lpa: string;
  apply_by: string;
  days_left: number;
  eligible: boolean;
  ineligible_reasons: string[];
  match_score: number;
  breakdown: { required: number; nice_to_have: number; location: number };
  matched_skills: string[];
  missing_required: string[];
  missing_nice_to_have: string[];
};

export type JobFilters = {
  city?: string;
  keyword?: string;
  job_type?: JobType;
  work_mode?: WorkMode;
};

export type ShortlistItem = {
  job_id: number;
  title: string;
  company: string;
  city: string;
  work_mode: string;
  job_type: string;
  apply_by: string;
  days_left: number;
  match_score: number | null;
  reason: string | null;
  status: ApplicationStatus;
  cover_note: string | null;
  saved_at: string;
};

export type SkillGapEntry = {
  skill: string;
  required_in_jobs: number;
  nice_to_have_in_jobs: number;
  jobs_fully_unlocked: number;
  avg_score_gain: number;
  roi_points: number;
  example_jobs: string[];
};

export type SkillGapPlan = {
  jobs_considered: number;
  top_skills_to_learn: SkillGapEntry[];
};

export type Insights = {
  open_jobs: number;
  eligible_jobs: number;
  strong_matches: number;
  closing_this_week: number;
  skill_plan: SkillGapPlan;
};

export type HealthStatus = {
  ok: boolean;
  llm: "groq" | "gemini" | "none";
  settings: Record<string, boolean>;
};

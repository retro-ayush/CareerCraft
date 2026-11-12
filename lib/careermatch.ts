import "server-only";
import { getSupabase } from "./supabase";
import { todayInIndia } from "./dates";

/*
 * CareerMatch core logic. Used by BOTH the agent tools and the REST APIs,
 * so the chat and the pages always show the same scores and rules.
 */

/** The logged-in student for the demo. */
export const CURRENT_STUDENT_ID = "S001";

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
  work_mode: "Onsite" | "Hybrid" | "Remote";
  job_type: "Full-time" | "Internship";
  min_cgpa: number;
  eligible_branches: string[];
  required_skills: string[];
  nice_to_have: string[];
  salary_lpa_min: number | null;
  salary_lpa_max: number | null;
  apply_by: string;
  description: string;
};

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

// ---------- skill helpers ----------

const ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  nodejs: "node.js",
  node: "node.js",
  "node js": "node.js",
  reactjs: "react",
  "react.js": "react",
  ml: "machine learning",
  "power-bi": "power bi",
  powerbi: "power bi",
  "springboot": "spring boot",
  "spring-boot": "spring boot",
  k8s: "kubernetes",
  "amazon web services": "aws",
  "ci cd": "ci/cd",
  cicd: "ci/cd",
  "llm api": "llm apis",
  llms: "llm apis",
  "prompt engineering": "prompting",
  dsa: "data structures",
  "embedded-c": "embedded c",
};

/** Lower case, trimmed, with common aliases mapped (e.g. "NodeJS" -> "node.js"). */
export function normalizeSkill(skill: string): string {
  const s = skill.trim().toLowerCase().replace(/\s+/g, " ");
  return ALIASES[s] ?? s;
}

export function normalizeSkills(skills: string[]): string[] {
  return Array.from(new Set(skills.map(normalizeSkill).filter(Boolean)));
}

// ---------- data access ----------

function toProfile(row: Record<string, unknown>): Profile {
  return { ...(row as Profile), cgpa: Number(row.cgpa), grad_year: Number(row.grad_year) };
}

function toJob(row: Record<string, unknown>): Job {
  return {
    ...(row as Job),
    id: Number(row.id),
    min_cgpa: Number(row.min_cgpa),
    salary_lpa_min: row.salary_lpa_min == null ? null : Number(row.salary_lpa_min),
    salary_lpa_max: row.salary_lpa_max == null ? null : Number(row.salary_lpa_max),
  };
}

export async function getProfile(id: string = CURRENT_STUDENT_ID): Promise<Profile> {
  const { data, error } = await getSupabase().from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`No student profile found with id ${id}`);
  return toProfile(data);
}

/** Jobs whose apply_by date has not passed. */
export async function getOpenJobs(): Promise<Job[]> {
  const { data, error } = await getSupabase()
    .from("jobs")
    .select("*")
    .gte("apply_by", todayInIndia())
    .order("apply_by", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toJob);
}

export async function getJob(id: number): Promise<Job> {
  const { data, error } = await getSupabase().from("jobs").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`No job found with id ${id}`);
  return toJob(data);
}

// ---------- matching ----------

function daysBetween(fromIso: string, toIso: string): number {
  const ms = new Date(`${toIso}T00:00:00Z`).getTime() - new Date(`${fromIso}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Match score (0-100):
 *   70% required skills covered + 20% nice-to-have skills covered + 10% location fit.
 * Eligibility (business rule): CGPA >= min_cgpa, branch is eligible, apply_by not passed.
 */
export function evaluateJob(job: Job, profile: Profile, skillsOverride?: string[]): JobMatch {
  const skills = new Set(normalizeSkills(skillsOverride ?? profile.skills));
  const today = todayInIndia();

  const reasons: string[] = [];
  if (profile.cgpa < job.min_cgpa) {
    reasons.push(`CGPA ${profile.cgpa} is below the minimum ${job.min_cgpa}`);
  }
  if (!job.eligible_branches.includes(profile.branch)) {
    reasons.push(`${profile.branch} branch is not eligible (only ${job.eligible_branches.join(", ")})`);
  }
  if (job.apply_by < today) reasons.push(`Applications closed on ${job.apply_by}`);

  const required = normalizeSkills(job.required_skills);
  const nice = normalizeSkills(job.nice_to_have);
  const matchedReq = required.filter((s) => skills.has(s));
  const matchedNice = nice.filter((s) => skills.has(s));

  const prefs = profile.preferred_cities.map((c) => c.toLowerCase());
  const locationFit =
    prefs.includes(job.city.toLowerCase()) || (job.work_mode === "Remote" && prefs.includes("remote"));

  const reqPts = required.length ? (matchedReq.length / required.length) * 70 : 70;
  const nicePts = nice.length ? (matchedNice.length / nice.length) * 20 : 20;
  const locPts = locationFit ? 10 : 0;

  const salary =
    job.salary_lpa_min != null && job.salary_lpa_max != null
      ? `${job.salary_lpa_min}-${job.salary_lpa_max} LPA`
      : "Not disclosed";

  return {
    job_id: job.id,
    title: job.title,
    company: job.company,
    city: job.city,
    work_mode: job.work_mode,
    job_type: job.job_type,
    salary_lpa: salary,
    apply_by: job.apply_by,
    days_left: daysBetween(today, job.apply_by),
    eligible: reasons.length === 0,
    ineligible_reasons: reasons,
    match_score: Math.round(reqPts + nicePts + locPts),
    breakdown: { required: Math.round(reqPts), nice_to_have: Math.round(nicePts), location: locPts },
    matched_skills: [...matchedReq, ...matchedNice],
    missing_required: required.filter((s) => !skills.has(s)),
    missing_nice_to_have: nice.filter((s) => !skills.has(s)),
  };
}

export type JobFilters = {
  city?: string;
  keyword?: string;
  job_type?: "Full-time" | "Internship";
  work_mode?: "Onsite" | "Hybrid" | "Remote";
};

export function filterJobs(jobs: Job[], f: JobFilters): Job[] {
  const city = f.city?.trim().toLowerCase();
  const words = (f.keyword ?? "")
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((w) => w.length > 1 && !["role", "roles", "job", "jobs"].includes(w));
  return jobs.filter((j) => {
    if (city && j.city.toLowerCase() !== city && !(city === "remote" && j.work_mode === "Remote")) return false;
    if (f.job_type && j.job_type !== f.job_type) return false;
    if (f.work_mode && j.work_mode !== f.work_mode) return false;
    if (words.length) {
      const hay = `${j.title} ${j.company} ${j.required_skills.join(" ")}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}

/** Sort: eligible first, then highest score, then closest deadline. */
export function rankMatches(matches: JobMatch[]): JobMatch[] {
  return [...matches].sort(
    (a, b) => Number(b.eligible) - Number(a.eligible) || b.match_score - a.match_score || a.days_left - b.days_left
  );
}

/** A job is a "strong match" when the student is eligible and has every required skill. */
export function countStrongMatches(jobs: Job[], profile: Profile, skills?: string[]): number {
  return jobs.map((j) => evaluateJob(j, profile, skills)).filter((m) => m.eligible && m.missing_required.length === 0)
    .length;
}

/**
 * SKILL ROI PLAN (our unique feature).
 * For every skill the student is missing, count how many eligible jobs it appears in,
 * and how many jobs would become a full required-skill match if they learned just that one skill.
 */
export function buildSkillGapPlan(jobs: Job[], profile: Profile, limit = 5) {
  const eligible = jobs.map((j) => ({ job: j, m: evaluateJob(j, profile) })).filter((x) => x.m.eligible);
  const stats = new Map<string, { required_in: number; nice_in: number; unlocks: number; avg_gain: number[]; examples: Set<string> }>();

  for (const { job, m } of eligible) {
    const missing = [...m.missing_required.map((s) => [s, true] as const), ...m.missing_nice_to_have.map((s) => [s, false] as const)];
    for (const [skill, isReq] of missing) {
      const st = stats.get(skill) ?? { required_in: 0, nice_in: 0, unlocks: 0, avg_gain: [], examples: new Set<string>() };
      if (isReq) st.required_in++;
      else st.nice_in++;
      if (isReq && m.missing_required.length === 1) st.unlocks++;
      const after = evaluateJob(job, profile, [...profile.skills, skill]);
      st.avg_gain.push(after.match_score - m.match_score);
      if (st.examples.size < 3) st.examples.add(`${job.title} @ ${job.company}`);
      stats.set(skill, st);
    }
  }

  const ranked = [...stats.entries()]
    .map(([skill, s]) => ({
      skill,
      required_in_jobs: s.required_in,
      nice_to_have_in_jobs: s.nice_in,
      jobs_fully_unlocked: s.unlocks,
      avg_score_gain: Math.round(s.avg_gain.reduce((a, b) => a + b, 0) / s.avg_gain.length),
      roi_points: s.unlocks * 5 + s.required_in * 2 + s.nice_in,
      example_jobs: [...s.examples],
    }))
    .sort((a, b) => b.roi_points - a.roi_points)
    .slice(0, limit);

  return { jobs_considered: eligible.length, top_skills_to_learn: ranked };
}

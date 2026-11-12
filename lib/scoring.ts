/**
 * Pure matching logic: skill normalisation, eligibility, the match score, filtering, ranking
 * and the Skill ROI plan. No I/O here, so it is shared by the agent tools and the REST API
 * (the chat and the pages always agree) and it is fully unit-tested (lib/scoring.test.ts).
 */
import { SCORE_WEIGHTS } from "./constants";
import { daysBetween, todayInIndia } from "./dates";
import type { Job, JobFilters, JobMatch, Profile, SkillGapEntry, SkillGapPlan } from "./types";

// ---------- skills ----------

const SKILL_ALIASES: Readonly<Record<string, string>> = {
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
  springboot: "spring boot",
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

/** Lower case, trimmed, single-spaced, with common aliases mapped (e.g. "NodeJS" -> "node.js"). */
export function normalizeSkill(skill: string): string {
  const s = skill.trim().toLowerCase().replace(/\s+/g, " ");
  return SKILL_ALIASES[s] ?? s;
}

/** Normalised, de-duplicated skill list (order preserved). */
export function normalizeSkills(skills: readonly string[]): string[] {
  return Array.from(new Set(skills.map(normalizeSkill).filter(Boolean)));
}

// ---------- evaluation ----------

function eligibilityReasons(job: Job, profile: Profile, today: string): string[] {
  const reasons: string[] = [];
  if (profile.cgpa < job.min_cgpa) reasons.push(`CGPA ${profile.cgpa} is below the minimum ${job.min_cgpa}`);
  if (!job.eligible_branches.includes(profile.branch)) {
    reasons.push(`${profile.branch} branch is not eligible (only ${job.eligible_branches.join(", ")})`);
  }
  if (job.apply_by < today) reasons.push(`Applications closed on ${job.apply_by}`);
  return reasons;
}

function isLocationFit(job: Job, preferredCities: readonly string[]): boolean {
  const prefs = preferredCities.map((c) => c.toLowerCase());
  return prefs.includes(job.city.toLowerCase()) || (job.work_mode === "Remote" && prefs.includes("remote"));
}

function formatSalary(job: Job): string {
  return job.salary_lpa_min != null && job.salary_lpa_max != null ? `${job.salary_lpa_min}-${job.salary_lpa_max} LPA` : "Not disclosed";
}

/**
 * Scores one job for a student.
 *
 * Match score (0-100) = 70 x (required skills covered) + 20 x (nice-to-have covered) + 10 if the city fits.
 * A job with no listed skills in a category gives full points for that category.
 * Eligibility (business rule): CGPA >= min_cgpa, branch is eligible, apply_by has not passed.
 *
 * @param skillsOverride evaluate with these skills instead of the profile's (used by what-if simulations)
 * @param today YYYY-MM-DD in India; injectable for deterministic tests
 */
export function evaluateJob(job: Job, profile: Profile, skillsOverride?: readonly string[], today: string = todayInIndia()): JobMatch {
  const skills = new Set(normalizeSkills(skillsOverride ?? profile.skills));
  const reasons = eligibilityReasons(job, profile, today);

  const required = normalizeSkills(job.required_skills);
  const nice = normalizeSkills(job.nice_to_have);
  const matchedReq = required.filter((s) => skills.has(s));
  const matchedNice = nice.filter((s) => skills.has(s));

  const reqPts = required.length ? (matchedReq.length / required.length) * SCORE_WEIGHTS.required : SCORE_WEIGHTS.required;
  const nicePts = nice.length ? (matchedNice.length / nice.length) * SCORE_WEIGHTS.niceToHave : SCORE_WEIGHTS.niceToHave;
  const locPts = isLocationFit(job, profile.preferred_cities) ? SCORE_WEIGHTS.location : 0;

  return {
    job_id: job.id,
    title: job.title,
    company: job.company,
    city: job.city,
    work_mode: job.work_mode,
    job_type: job.job_type,
    salary_lpa: formatSalary(job),
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

/** A job is a "strong match" when the student is eligible and has every required skill. */
export function isStrongMatch(m: JobMatch): boolean {
  return m.eligible && m.missing_required.length === 0;
}

export function countStrongMatches(jobs: readonly Job[], profile: Profile, skills?: readonly string[], today: string = todayInIndia()): number {
  return jobs.filter((j) => isStrongMatch(evaluateJob(j, profile, skills, today))).length;
}

// ---------- filtering & ranking ----------

const STOP_WORDS = new Set(["role", "roles", "job", "jobs"]);

/**
 * Filters jobs by city (case-insensitive; "remote" also matches remote work mode), job type, work mode,
 * and keywords. Every keyword must appear in the title, company or required skills.
 */
export function filterJobs(jobs: readonly Job[], filters: JobFilters): Job[] {
  const city = filters.city?.trim().toLowerCase();
  const words = (filters.keyword ?? "")
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  return jobs.filter((j) => {
    if (city && j.city.toLowerCase() !== city && !(city === "remote" && j.work_mode === "Remote")) return false;
    if (filters.job_type && j.job_type !== filters.job_type) return false;
    if (filters.work_mode && j.work_mode !== filters.work_mode) return false;
    if (words.length) {
      const haystack = `${j.title} ${j.company} ${j.required_skills.join(" ")}`.toLowerCase();
      if (!words.every((w) => haystack.includes(w))) return false;
    }
    return true;
  });
}

/** Sort: eligible first, then highest score, then closest deadline. Returns a new array. */
export function rankMatches(matches: readonly JobMatch[]): JobMatch[] {
  return [...matches].sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.match_score - a.match_score || a.days_left - b.days_left);
}

// ---------- Skill ROI plan ----------

type SkillStats = { requiredIn: number; niceIn: number; unlocks: number; gains: number[]; examples: Set<string> };

/** ROI weighting: fully unlocking a job is worth most, then appearing as required, then as nice-to-have. */
const ROI_WEIGHTS = { unlock: 5, required: 2, nice: 1 } as const;

/**
 * SKILL ROI PLAN (our unique feature).
 * For every skill the student is missing in an eligible job, counts how often it is required / nice-to-have,
 * how many jobs it would fully unlock on its own, and the average score gain from learning it.
 */
export function buildSkillGapPlan(jobs: readonly Job[], profile: Profile, limit = 5, today: string = todayInIndia()): SkillGapPlan {
  const eligible = jobs.map((job) => ({ job, match: evaluateJob(job, profile, undefined, today) })).filter((x) => x.match.eligible);
  const stats = new Map<string, SkillStats>();

  for (const { job, match } of eligible) {
    const missing: [string, boolean][] = [
      ...match.missing_required.map((s): [string, boolean] => [s, true]),
      ...match.missing_nice_to_have.map((s): [string, boolean] => [s, false]),
    ];
    for (const [skill, isRequired] of missing) {
      const st = stats.get(skill) ?? { requiredIn: 0, niceIn: 0, unlocks: 0, gains: [], examples: new Set<string>() };
      if (isRequired) st.requiredIn++;
      else st.niceIn++;
      if (isRequired && match.missing_required.length === 1) st.unlocks++;
      st.gains.push(evaluateJob(job, profile, [...profile.skills, skill], today).match_score - match.match_score);
      if (st.examples.size < 3) st.examples.add(`${job.title} @ ${job.company}`);
      stats.set(skill, st);
    }
  }

  const ranked: SkillGapEntry[] = [...stats.entries()]
    .map(([skill, s]) => ({
      skill,
      required_in_jobs: s.requiredIn,
      nice_to_have_in_jobs: s.niceIn,
      jobs_fully_unlocked: s.unlocks,
      avg_score_gain: Math.round(s.gains.reduce((a, b) => a + b, 0) / s.gains.length),
      roi_points: s.unlocks * ROI_WEIGHTS.unlock + s.requiredIn * ROI_WEIGHTS.required + s.niceIn * ROI_WEIGHTS.nice,
      example_jobs: [...s.examples],
    }))
    .sort((a, b) => b.roi_points - a.roi_points)
    .slice(0, limit);

  return { jobs_considered: eligible.length, top_skills_to_learn: ranked };
}

import "server-only";
import { CURRENT_STUDENT_ID } from "./constants";
import { todayInIndia } from "./dates";
import { NotFoundError, dbError } from "./errors";
import { getSupabase } from "./supabase";
import type { Job, Profile } from "./types";

/*
 * CareerMatch data access (Supabase). Pure scoring lives in ./scoring and is re-exported here
 * so callers have one import for "the CareerMatch domain".
 */

export { CURRENT_STUDENT_ID } from "./constants";
export type { Job, JobFilters, JobMatch, Profile } from "./types";
export { buildSkillGapPlan, countStrongMatches, evaluateJob, filterJobs, normalizeSkill, normalizeSkills, rankMatches } from "./scoring";

/** Postgres numeric columns arrive as strings; coerce them at the boundary. */
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
  if (error) throw dbError(error);
  if (!data) throw new NotFoundError(`No student profile found with id ${id}`);
  return toProfile(data);
}

/** Jobs whose apply_by date has not passed (India time), soonest deadline first. */
export async function getOpenJobs(): Promise<Job[]> {
  const { data, error } = await getSupabase().from("jobs").select("*").gte("apply_by", todayInIndia()).order("apply_by", { ascending: true });
  if (error) throw dbError(error);
  return (data ?? []).map(toJob);
}

export async function getJob(id: number): Promise<Job> {
  const { data, error } = await getSupabase().from("jobs").select("*").eq("id", id).maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw new NotFoundError(`No job found with id ${id}`);
  return toJob(data);
}

/** Fetches several jobs in one query, keyed by id. Missing ids are simply absent from the map. */
export async function getJobsByIds(ids: readonly number[]): Promise<Map<number, Job>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await getSupabase().from("jobs").select("*").in("id", ids);
  if (error) throw dbError(error);
  return new Map((data ?? []).map((row) => {
    const job = toJob(row);
    return [job.id, job] as const;
  }));
}

/** Updates profile columns for the current student. */
export async function updateProfile(fields: Partial<Pick<Profile, "skills" | "preferred_cities" | "interests">>, id: string = CURRENT_STUDENT_ID): Promise<Profile> {
  const { error } = await getSupabase().from("profiles").update(fields).eq("id", id);
  if (error) throw dbError(error);
  return getProfile(id);
}

import "server-only";
import { getJobsByIds, getOpenJobs, getProfile } from "./careermatch";
import { CURRENT_STUDENT_ID } from "./constants";
import { daysBetween, todayInIndia } from "./dates";
import { NotFoundError, dbError } from "./errors";
import { countStrongMatches, evaluateJob, normalizeSkill, normalizeSkills } from "./scoring";
import { getSupabase } from "./supabase";
import type { ApplicationStatus, Job, JobMatch, ShortlistItem } from "./types";

export { APPLICATION_STATUSES } from "./constants";
export type { ApplicationStatus, ShortlistItem } from "./types";

/** Postgres unique_violation: the (profile_id, job_id) pair already exists. */
const UNIQUE_VIOLATION = "23505";

type ShortlistRow = {
  job_id: number;
  match_score: number | null;
  reason: string | null;
  status: ApplicationStatus | null;
  cover_note: string | null;
  created_at: string;
  jobs: Pick<Job, "title" | "company" | "city" | "work_mode" | "job_type" | "apply_by">;
};

export type SaveResult = {
  saved: { job_id: number; title: string; company: string; match_score: number }[];
  skipped: { job_id: number; why: string }[];
};

function notShortlisted(jobId: number) {
  return new NotFoundError(`Job ${jobId} is not in your shortlist. Save it to the shortlist first.`);
}

export async function getShortlist(profileId: string = CURRENT_STUDENT_ID): Promise<ShortlistItem[]> {
  const { data, error } = await getSupabase()
    .from("shortlists")
    .select("job_id, match_score, reason, status, cover_note, created_at, jobs(title, company, city, work_mode, job_type, apply_by)")
    .eq("profile_id", profileId)
    .order("match_score", { ascending: false });
  if (error) throw dbError(error);

  const today = todayInIndia();
  return ((data ?? []) as unknown as ShortlistRow[]).map((r) => ({
    job_id: Number(r.job_id),
    ...r.jobs,
    days_left: daysBetween(today, r.jobs.apply_by),
    match_score: r.match_score,
    reason: r.reason,
    status: r.status ?? "saved",
    cover_note: r.cover_note ?? null,
    saved_at: r.created_at,
  }));
}

function autoReason(m: JobMatch): string {
  const has = `Has ${m.matched_skills.join(", ") || "no listed skills"}`;
  return has + (m.missing_required.length ? `; missing ${m.missing_required.join(", ")}` : "; all required skills");
}

/**
 * Saves jobs to the shortlist. Business rules enforced here (not in the UI or the prompt):
 * only existing, eligible jobs are saved, and duplicates are skipped. Never throws for a single
 * bad id; each refusal is reported in `skipped` with a reason the agent can explain.
 */
export async function addToShortlist(jobIds: readonly number[], reason?: string, profileId: string = CURRENT_STUDENT_ID): Promise<SaveResult> {
  const ids = [...new Set(jobIds)];
  const [profile, jobs, existing] = await Promise.all([
    getProfile(profileId),
    getJobsByIds(ids),
    getSupabase().from("shortlists").select("job_id").eq("profile_id", profileId).in("job_id", ids),
  ]);
  if (existing.error) throw dbError(existing.error);
  const already = new Set((existing.data ?? []).map((e) => Number(e.job_id)));

  const result: SaveResult = { saved: [], skipped: [] };
  const today = todayInIndia();
  const rows: { profile_id: string; job_id: number; match_score: number; reason: string }[] = [];

  for (const id of ids) {
    const job = jobs.get(id);
    if (already.has(id)) {
      result.skipped.push({ job_id: id, why: "Already in your shortlist" });
    } else if (!job) {
      result.skipped.push({ job_id: id, why: "Job not found" });
    } else {
      const m = evaluateJob(job, profile, undefined, today);
      if (!m.eligible) {
        result.skipped.push({ job_id: id, why: `Not eligible: ${m.ineligible_reasons.join("; ")}` });
      } else {
        rows.push({ profile_id: profileId, job_id: id, match_score: m.match_score, reason: reason?.trim() || autoReason(m) });
        result.saved.push({ job_id: id, title: job.title, company: job.company, match_score: m.match_score });
      }
    }
  }

  if (rows.length) {
    const { error } = await getSupabase().from("shortlists").insert(rows);
    if (error?.code === UNIQUE_VIOLATION) {
      // Lost a race with a concurrent save: report rather than fail.
      return { saved: [], skipped: [...result.skipped, ...result.saved.map((s) => ({ job_id: s.job_id, why: "Already in your shortlist" }))] };
    }
    if (error) throw dbError(error);
  }
  return result;
}

export async function setApplicationStatus(jobId: number, status: ApplicationStatus, profileId: string = CURRENT_STUDENT_ID) {
  const { data, error } = await getSupabase()
    .from("shortlists")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("profile_id", profileId)
    .eq("job_id", jobId)
    .select("job_id, status")
    .maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw notShortlisted(jobId);
  return data as { job_id: number; status: ApplicationStatus };
}

export async function setCoverNote(jobId: number, note: string, profileId: string = CURRENT_STUDENT_ID) {
  const { data, error } = await getSupabase()
    .from("shortlists")
    .update({ cover_note: note, updated_at: new Date().toISOString() })
    .eq("profile_id", profileId)
    .eq("job_id", jobId)
    .select("job_id")
    .maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw notShortlisted(jobId);
  return { job_id: jobId, saved_characters: note.length };
}

export async function removeFromShortlist(jobId: number, profileId: string = CURRENT_STUDENT_ID) {
  const { data, error } = await getSupabase().from("shortlists").delete().eq("profile_id", profileId).eq("job_id", jobId).select("job_id");
  if (error) throw dbError(error);
  if (!data?.length) throw notShortlisted(jobId);
  return { removed_job_id: jobId };
}

/** Adds and/or removes skills on the profile. Returns the strong-match count before and after. */
export async function changeSkills(add: readonly string[], remove: readonly string[], profileId: string = CURRENT_STUDENT_ID) {
  const [profile, jobs] = await Promise.all([getProfile(profileId), getOpenJobs()]);
  const toAdd = normalizeSkills(add);
  const toRemove = new Set(normalizeSkills(remove));
  const next = normalizeSkills([...profile.skills.filter((s) => !toRemove.has(normalizeSkill(s))), ...toAdd]);

  const { error } = await getSupabase().from("profiles").update({ skills: next }).eq("id", profileId);
  if (error) throw dbError(error);

  const today = todayInIndia();
  return {
    added: toAdd.filter((s) => !profile.skills.includes(s)),
    removed: profile.skills.filter((s) => toRemove.has(normalizeSkill(s))),
    skills_now: next,
    strong_matches_before: countStrongMatches(jobs, profile, undefined, today),
    strong_matches_after: countStrongMatches(jobs, { ...profile, skills: next }, undefined, today),
  };
}

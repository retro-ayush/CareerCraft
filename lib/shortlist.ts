import "server-only";
import { getSupabase } from "./supabase";
import {
  CURRENT_STUDENT_ID,
  countStrongMatches,
  evaluateJob,
  getJob,
  getOpenJobs,
  getProfile,
  normalizeSkill,
  normalizeSkills,
  type Job,
} from "./careermatch";
import { todayInIndia } from "./dates";

export const APPLICATION_STATUSES = ["saved", "applied", "interviewing", "offer", "rejected"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

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

export async function getShortlist(profileId: string = CURRENT_STUDENT_ID): Promise<ShortlistItem[]> {
  const { data, error } = await getSupabase()
    .from("shortlists")
    .select("job_id, match_score, reason, status, cover_note, created_at, jobs(title, company, city, work_mode, job_type, apply_by)")
    .eq("profile_id", profileId)
    .order("match_score", { ascending: false });
  if (error) throw new Error(error.message);

  const today = new Date(`${todayInIndia()}T00:00:00Z`).getTime();
  return (data ?? []).map((row) => {
    const r = row as unknown as {
      job_id: number;
      match_score: number | null;
      reason: string | null;
      status: ApplicationStatus | null;
      cover_note: string | null;
      created_at: string;
      jobs: Pick<Job, "title" | "company" | "city" | "work_mode" | "job_type" | "apply_by">;
    };
    return {
      job_id: Number(r.job_id),
      ...r.jobs,
      days_left: Math.round((new Date(`${r.jobs.apply_by}T00:00:00Z`).getTime() - today) / 86_400_000),
      match_score: r.match_score,
      reason: r.reason,
      status: r.status ?? "saved",
      cover_note: r.cover_note ?? null,
      saved_at: r.created_at,
    };
  });
}

/** Saves jobs to the shortlist. Enforces the eligibility rule in code. */
export async function addToShortlist(jobIds: number[], reason?: string, profileId: string = CURRENT_STUDENT_ID) {
  const profile = await getProfile(profileId);
  const { data: existing, error: exErr } = await getSupabase()
    .from("shortlists")
    .select("job_id")
    .eq("profile_id", profileId)
    .in("job_id", jobIds);
  if (exErr) throw new Error(exErr.message);
  const already = new Set((existing ?? []).map((e) => Number(e.job_id)));

  const saved: { job_id: number; title: string; company: string; match_score: number }[] = [];
  const skipped: { job_id: number; why: string }[] = [];

  for (const id of jobIds) {
    if (already.has(id)) {
      skipped.push({ job_id: id, why: "Already in your shortlist" });
      continue;
    }
    let job: Job;
    try {
      job = await getJob(id);
    } catch {
      skipped.push({ job_id: id, why: "Job not found" });
      continue;
    }
    const m = evaluateJob(job, profile);
    if (!m.eligible) {
      skipped.push({ job_id: id, why: `Not eligible: ${m.ineligible_reasons.join("; ")}` });
      continue;
    }
    const autoReason =
      reason?.trim() ||
      `Has ${m.matched_skills.join(", ") || "no listed skills"}` +
        (m.missing_required.length ? `; missing ${m.missing_required.join(", ")}` : "; all required skills");
    const { error } = await getSupabase()
      .from("shortlists")
      .insert({ profile_id: profileId, job_id: id, match_score: m.match_score, reason: autoReason });
    if (error) {
      skipped.push({ job_id: id, why: error.message });
      continue;
    }
    saved.push({ job_id: id, title: job.title, company: job.company, match_score: m.match_score });
  }
  return { saved, skipped };
}

async function requireShortlisted(jobId: number, profileId: string) {
  const { data, error } = await getSupabase()
    .from("shortlists")
    .select("id")
    .eq("profile_id", profileId)
    .eq("job_id", jobId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Job ${jobId} is not in your shortlist. Save it to the shortlist first.`);
}

export async function setApplicationStatus(jobId: number, status: ApplicationStatus, profileId: string = CURRENT_STUDENT_ID) {
  await requireShortlisted(jobId, profileId);
  const { data, error } = await getSupabase()
    .from("shortlists")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("profile_id", profileId)
    .eq("job_id", jobId)
    .select("job_id, status")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function setCoverNote(jobId: number, note: string, profileId: string = CURRENT_STUDENT_ID) {
  await requireShortlisted(jobId, profileId);
  const { error } = await getSupabase()
    .from("shortlists")
    .update({ cover_note: note, updated_at: new Date().toISOString() })
    .eq("profile_id", profileId)
    .eq("job_id", jobId);
  if (error) throw new Error(error.message);
  return { job_id: jobId, saved_characters: note.length };
}

export async function removeFromShortlist(jobId: number, profileId: string = CURRENT_STUDENT_ID) {
  await requireShortlisted(jobId, profileId);
  const { error } = await getSupabase().from("shortlists").delete().eq("profile_id", profileId).eq("job_id", jobId);
  if (error) throw new Error(error.message);
  return { removed_job_id: jobId };
}

/** Adds and/or removes skills on the profile. Returns before/after strong-match counts. */
export async function changeSkills(add: string[], remove: string[], profileId: string = CURRENT_STUDENT_ID) {
  const profile = await getProfile(profileId);
  const toAdd = normalizeSkills(add);
  const toRemove = new Set(normalizeSkills(remove));
  const next = normalizeSkills([...profile.skills.filter((s) => !toRemove.has(normalizeSkill(s))), ...toAdd]);

  const { error } = await getSupabase().from("profiles").update({ skills: next }).eq("id", profileId);
  if (error) throw new Error(error.message);

  const jobs = await getOpenJobs();
  return {
    added: toAdd.filter((s) => !profile.skills.includes(s)),
    removed: profile.skills.filter((s) => toRemove.has(normalizeSkill(s))),
    skills_now: next,
    strong_matches_before: countStrongMatches(jobs, profile),
    strong_matches_after: countStrongMatches(jobs, { ...profile, skills: next }),
  };
}


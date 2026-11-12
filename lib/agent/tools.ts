import "server-only";
import { z } from "zod";
import { defineTool, type AgentTool } from "./defineTool";
import {
  buildSkillGapPlan,
  evaluateJob,
  filterJobs,
  getJob,
  getOpenJobs,
  getProfile,
  normalizeSkills,
  rankMatches,
} from "../careermatch";
import { APPLICATION_STATUSES, JOB_TYPES, WORK_MODES } from "../constants";
import { NotFoundError, ValidationError } from "../errors";
import {
  addToShortlist,
  changeSkills,
  getShortlist,
  setApplicationStatus,
  setCoverNote,
} from "../shortlist";

/*
 * CareerMatch agent tools (PS6 Job Match Agent).
 * Every tool reads or writes Supabase. Business rules are checked in code:
 *  - skip jobs where CGPA < min_cgpa, the branch is not eligible, or apply_by has passed
 *  - only eligible jobs can be shortlisted
 *  - status / cover notes only for jobs already in the shortlist
 */

const skillList = z.array(z.string().trim().min(1).max(40)).min(1).max(10);

// ---------------- READ tools ----------------

const getMyProfile = defineTool({
  name: "getMyProfile",
  description:
    "Use this when you need the student's profile: name, branch, CGPA, graduation year, preferred cities, skills and interests.",
  schema: z.object({}),
  run: async () => getProfile(),
});

const searchJobs = defineTool({
  name: "searchJobs",
  description:
    "Use this when the student wants to find, list or compare jobs. Returns open jobs scored for the student (0-100), best first, with matched and missing skills. Ineligible jobs (low CGPA, wrong branch, deadline passed) are skipped unless include_ineligible is true.",
  schema: z.object({
    city: z.string().trim().max(40).optional().describe("City to filter by, e.g. Chennai, Bengaluru, Hyderabad, Pune, Coimbatore, or Remote"),
    keyword: z.string().trim().max(60).optional().describe("Words from the role title or a skill, e.g. 'data analyst', 'react', 'intern'"),
    job_type: z.enum(JOB_TYPES).optional().describe("Full-time or Internship"),
    work_mode: z.enum(WORK_MODES).optional().describe("Onsite, Hybrid or Remote"),
    min_score: z.number().int().min(0).max(100).optional().describe("Only return jobs with match_score at or above this"),
    limit: z.number().int().min(1).max(15).optional().describe("Max jobs to return. Default 8"),
    include_ineligible: z.boolean().optional().describe("true to also show jobs the student cannot apply for, with the reason"),
  }),
  run: async ({ city, keyword, job_type, work_mode, min_score, limit, include_ineligible }) => {
    const [profile, jobs] = await Promise.all([getProfile(), getOpenJobs()]);
    const filtered = filterJobs(jobs, { city, keyword, job_type, work_mode });
    let matches = rankMatches(filtered.map((j) => evaluateJob(j, profile)));
    const ineligibleCount = matches.filter((m) => !m.eligible).length;
    if (!include_ineligible) matches = matches.filter((m) => m.eligible);
    if (min_score != null) matches = matches.filter((m) => m.match_score >= min_score);
    const top = matches.slice(0, limit ?? 8).map((m) => ({
      job_id: m.job_id,
      title: m.title,
      company: m.company,
      city: m.city,
      work_mode: m.work_mode,
      job_type: m.job_type,
      salary_lpa: m.salary_lpa,
      days_left: m.days_left,
      match_score: m.match_score,
      missing_required: m.missing_required,
      ...(m.eligible ? {} : { ineligible_reasons: m.ineligible_reasons }),
    }));
    return {
      total_open_jobs_matching_filters: filtered.length,
      skipped_as_ineligible: include_ineligible ? 0 : ineligibleCount,
      returned: top.length,
      jobs: top,
    };
  },
});

const scoreJobMatch = defineTool({
  name: "scoreJobMatch",
  description:
    "Use this when the student asks about ONE specific job: how well they match, why, which skills are missing, or whether they are eligible. Needs the job id (call searchJobs first if unknown).",
  schema: z.object({
    job_id: z.number().int().positive().describe("The job id, e.g. 5"),
  }),
  run: async ({ job_id }) => {
    const [profile, job] = await Promise.all([getProfile(), getJob(job_id)]);
    const m = evaluateJob(job, profile);
    return { ...m, description: job.description, min_cgpa: job.min_cgpa, eligible_branches: job.eligible_branches };
  },
});

const getSkillGapPlan = defineTool({
  name: "getSkillGapPlan",
  description:
    "Use this when the student asks which skills they are missing, what to learn next, or how to become eligible for more roles (optionally for a role like 'data analyst'). Ranks missing skills by how many eligible jobs each one unlocks (Skill ROI).",
  schema: z.object({
    role_keyword: z.string().trim().max(60).optional().describe("Optional role words to focus on, e.g. 'data analyst', 'frontend', 'intern'"),
    city: z.string().trim().max(40).optional().describe("Optional city filter"),
  }),
  run: async ({ role_keyword, city }) => {
    const [profile, jobs] = await Promise.all([getProfile(), getOpenJobs()]);
    const filtered = filterJobs(jobs, { keyword: role_keyword, city });
    if (filtered.length === 0) throw new NotFoundError(`No open jobs found for "${role_keyword ?? ""}" ${city ?? ""}. Try a broader role.`);
    return { student_skills: profile.skills, ...buildSkillGapPlan(filtered, profile) };
  },
});

const whatIfLearnSkill = defineTool({
  name: "whatIfLearnSkill",
  description:
    "Use this when the student asks 'what if I learn X' or wants to see how new skills WOULD change their matches, without saving anything to the profile.",
  schema: z.object({
    skills: skillList.describe("Skills to simulate, e.g. ['docker', 'power bi']"),
  }),
  run: async ({ skills }) => {
    const [profile, jobs] = await Promise.all([getProfile(), getOpenJobs()]);
    const newSkills = normalizeSkills(skills);
    const changes = jobs
      .map((j) => ({ before: evaluateJob(j, profile), after: evaluateJob(j, profile, [...profile.skills, ...newSkills]) }))
      .filter((x) => x.before.eligible && x.after.match_score > x.before.match_score)
      .sort((a, b) => b.after.match_score - b.before.match_score - (a.after.match_score - a.before.match_score));
    const fullBefore = changes.filter((x) => x.before.missing_required.length === 0).length;
    const fullAfter = changes.filter((x) => x.after.missing_required.length === 0).length;
    return {
      simulated_skills: newSkills,
      jobs_improved: changes.length,
      new_full_required_matches: fullAfter - fullBefore,
      top_improvements: changes.slice(0, 6).map((x) => ({
        job_id: x.after.job_id,
        title: x.after.title,
        company: x.after.company,
        city: x.after.city,
        score_before: x.before.match_score,
        score_after: x.after.match_score,
        still_missing: x.after.missing_required,
      })),
    };
  },
});

const getMyShortlist = defineTool({
  name: "getMyShortlist",
  description:
    "Use this when the student wants to see saved/shortlisted jobs, application status, upcoming deadlines, or needs a job id from the shortlist.",
  schema: z.object({}),
  run: async () => {
    const items = await getShortlist();
    return {
      count: items.length,
      jobs: items.map(({ cover_note, saved_at: _s, ...rest }) => ({ ...rest, has_cover_note: Boolean(cover_note) })),
    };
  },
});

// ---------------- WRITE tools ----------------

const saveToShortlist = defineTool({
  name: "saveToShortlist",
  description:
    "Use this when the student asks to save, shortlist or bookmark one or more jobs. Pass the job ids from searchJobs. Ineligible jobs and duplicates are refused automatically.",
  writes: true,
  schema: z.object({
    job_ids: z.array(z.number().int().positive()).min(1).max(5).describe("Job ids to save, e.g. [3, 7, 12]"),
    reason: z.string().trim().max(300).optional().describe("Optional short note why these jobs fit the student"),
  }),
  run: async ({ job_ids, reason }) => addToShortlist(job_ids, reason),
});

const updateMySkills = defineTool({
  name: "updateMySkills",
  description:
    "Use this when the student says they learned a new skill or wants to add or remove skills on their profile. Saves the change and returns how many strong matches they had before and after.",
  writes: true,
  schema: z.object({
    add: z.array(z.string().trim().min(1).max(40)).max(10).optional().describe("Skills to add, e.g. ['docker']"),
    remove: z.array(z.string().trim().min(1).max(40)).max(10).optional().describe("Skills to remove"),
  }),
  run: async ({ add, remove }) => {
    if (!add?.length && !remove?.length) throw new ValidationError("Tell me which skill to add or remove.");
    return changeSkills(add ?? [], remove ?? []);
  },
});

const updateApplicationStatus = defineTool({
  name: "updateApplicationStatus",
  description:
    "Use this when the student says they applied, got an interview, got an offer or were rejected for a shortlisted job. The job must already be in the shortlist.",
  writes: true,
  schema: z.object({
    job_id: z.number().int().positive().describe("The job id from the shortlist"),
    status: z.enum(APPLICATION_STATUSES).describe("New status: saved, applied, interviewing, offer or rejected"),
  }),
  run: async ({ job_id, status }) => setApplicationStatus(job_id, status),
});

const saveCoverNote = defineTool({
  name: "saveCoverNote",
  description:
    "Use this after you have written a short cover note for a shortlisted job, to save it. First call getMyProfile and scoreJobMatch so the note uses the student's real skills. Never invent experience.",
  writes: true,
  schema: z.object({
    job_id: z.number().int().positive().describe("The shortlisted job id"),
    note: z.string().trim().min(80).max(2000).describe("The cover note text, 80-180 words, plain text"),
  }),
  run: async ({ job_id, note }) => setCoverNote(job_id, note),
});

/** Every tool in this list is given to Gemini. */
export const tools: AgentTool[] = [
  getMyProfile,
  searchJobs,
  scoreJobMatch,
  getSkillGapPlan,
  whatIfLearnSkill,
  getMyShortlist,
  saveToShortlist,
  updateMySkills,
  updateApplicationStatus,
  saveCoverNote,
];

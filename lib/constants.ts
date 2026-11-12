/**
 * Domain constants shared by the server (validation, agent tools) and the browser (UI).
 * Keep this file free of server-only imports.
 */

/** The logged-in student for the demo (single-tenant app, see README). */
export const CURRENT_STUDENT_ID = "S001";

export const APPLICATION_STATUSES = ["saved", "applied", "interviewing", "offer", "rejected"] as const;
export const JOB_TYPES = ["Full-time", "Internship"] as const;
export const WORK_MODES = ["Onsite", "Hybrid", "Remote"] as const;

/** Match score weights (must add up to 100). */
export const SCORE_WEIGHTS = { required: 70, niceToHave: 20, location: 10 } as const;

/** A good fit closing within this many days is flagged as urgent. */
export const CLOSING_SOON_DAYS = 7;
/** Minimum score for a job to count as a "good fit". */
export const GOOD_FIT_SCORE = 50;

import type { Job, Profile } from "@/lib/types";

export const TODAY = "2026-11-12";

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "S001",
    name: "Divya K",
    degree: "B.Tech",
    branch: "CSE",
    grad_year: 2027,
    cgpa: 8.1,
    preferred_cities: ["Chennai", "Bengaluru"],
    skills: ["python", "sql", "excel"],
    interests: "Data",
    ...overrides,
  };
}

let nextId = 1;
export function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: nextId++,
    title: "Data Analyst",
    company: "Acme Analytics",
    city: "Chennai",
    work_mode: "Onsite",
    job_type: "Full-time",
    min_cgpa: 7,
    eligible_branches: ["CSE", "IT"],
    required_skills: ["python", "sql"],
    nice_to_have: ["power bi", "excel"],
    salary_lpa_min: 4,
    salary_lpa_max: 6,
    apply_by: "2026-11-20",
    description: "Analyse data.",
    ...overrides,
  };
}

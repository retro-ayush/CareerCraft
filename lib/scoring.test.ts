import { describe, expect, it } from "vitest";
import { TODAY, makeJob, makeProfile } from "@/test/fixtures";
import { buildSkillGapPlan, countStrongMatches, evaluateJob, filterJobs, normalizeSkill, normalizeSkills, rankMatches } from "./scoring";

describe("normalizeSkill", () => {
  it("lower-cases, trims and collapses whitespace", () => {
    expect(normalizeSkill("  Machine   Learning ")).toBe("machine learning");
  });
  it.each([
    ["NodeJS", "node.js"],
    ["ReactJS", "react"],
    ["PowerBI", "power bi"],
    ["k8s", "kubernetes"],
    ["JS", "javascript"],
  ])("maps alias %s -> %s", (input, expected) => {
    expect(normalizeSkill(input)).toBe(expected);
  });
  it("de-duplicates after normalising and drops empties", () => {
    expect(normalizeSkills(["React", "reactjs", " ", "SQL"])).toEqual(["react", "sql"]);
  });
});

describe("evaluateJob: match score", () => {
  it("gives 100 when every skill matches and the city is preferred", () => {
    const m = evaluateJob(makeJob(), makeProfile({ skills: ["python", "sql", "power bi", "excel"] }), undefined, TODAY);
    expect(m.match_score).toBe(100);
    expect(m.breakdown).toEqual({ required: 70, nice_to_have: 20, location: 10 });
    expect(m.missing_required).toEqual([]);
  });

  it("weights required skills 70%, nice-to-have 20%, city 10%", () => {
    // 1/2 required (35) + 1/2 nice (10) + no city (0)
    const m = evaluateJob(makeJob({ city: "Pune" }), makeProfile({ skills: ["python", "excel"] }), undefined, TODAY);
    expect(m.match_score).toBe(45);
    expect(m.missing_required).toEqual(["sql"]);
    expect(m.missing_nice_to_have).toEqual(["power bi"]);
    expect(m.matched_skills).toEqual(["python", "excel"]);
  });

  it("gives full points for a category with no listed skills", () => {
    const m = evaluateJob(makeJob({ required_skills: [], nice_to_have: [] }), makeProfile({ skills: [] }), undefined, TODAY);
    expect(m.match_score).toBe(100);
  });

  it("matches skills through aliases", () => {
    const m = evaluateJob(makeJob({ required_skills: ["React.js"], nice_to_have: [] }), makeProfile({ skills: ["reactjs"] }), undefined, TODAY);
    expect(m.missing_required).toEqual([]);
  });

  it("treats remote jobs as a location fit when the student prefers remote", () => {
    const job = makeJob({ city: "Hyderabad", work_mode: "Remote" });
    expect(evaluateJob(job, makeProfile({ preferred_cities: ["Remote"] }), undefined, TODAY).breakdown.location).toBe(10);
    expect(evaluateJob(job, makeProfile({ preferred_cities: ["Chennai"] }), undefined, TODAY).breakdown.location).toBe(0);
  });

  it("uses skillsOverride for what-if simulations without touching the profile", () => {
    const profile = makeProfile({ skills: ["python"] });
    const after = evaluateJob(makeJob(), profile, [...profile.skills, "sql"], TODAY);
    expect(after.missing_required).toEqual([]);
    expect(profile.skills).toEqual(["python"]);
  });

  it("computes days left until the deadline", () => {
    expect(evaluateJob(makeJob({ apply_by: "2026-11-19" }), makeProfile(), undefined, TODAY).days_left).toBe(7);
  });

  it("formats salary, or says when it is not disclosed", () => {
    expect(evaluateJob(makeJob(), makeProfile(), undefined, TODAY).salary_lpa).toBe("4-6 LPA");
    expect(evaluateJob(makeJob({ salary_lpa_max: null }), makeProfile(), undefined, TODAY).salary_lpa).toBe("Not disclosed");
  });
});

describe("evaluateJob: eligibility rule", () => {
  it("is eligible when CGPA, branch and deadline all pass", () => {
    expect(evaluateJob(makeJob(), makeProfile(), undefined, TODAY).eligible).toBe(true);
  });
  it("rejects a CGPA below the minimum", () => {
    const m = evaluateJob(makeJob({ min_cgpa: 8.5 }), makeProfile({ cgpa: 8.1 }), undefined, TODAY);
    expect(m.eligible).toBe(false);
    expect(m.ineligible_reasons).toEqual(["CGPA 8.1 is below the minimum 8.5"]);
  });
  it("accepts a CGPA exactly at the minimum", () => {
    expect(evaluateJob(makeJob({ min_cgpa: 8.1 }), makeProfile({ cgpa: 8.1 }), undefined, TODAY).eligible).toBe(true);
  });
  it("rejects an ineligible branch", () => {
    const m = evaluateJob(makeJob({ eligible_branches: ["ECE"] }), makeProfile(), undefined, TODAY);
    expect(m.ineligible_reasons[0]).toMatch(/CSE branch is not eligible/);
  });
  it("rejects a passed deadline but allows today", () => {
    expect(evaluateJob(makeJob({ apply_by: "2026-11-11" }), makeProfile(), undefined, TODAY).eligible).toBe(false);
    expect(evaluateJob(makeJob({ apply_by: TODAY }), makeProfile(), undefined, TODAY).eligible).toBe(true);
  });
  it("reports every failing rule", () => {
    const m = evaluateJob(makeJob({ min_cgpa: 9, eligible_branches: ["ECE"], apply_by: "2026-01-01" }), makeProfile(), undefined, TODAY);
    expect(m.ineligible_reasons).toHaveLength(3);
  });
});

describe("filterJobs", () => {
  const jobs = [
    makeJob({ title: "Data Analyst", city: "Chennai", required_skills: ["sql"] }),
    makeJob({ title: "Frontend Developer", city: "Pune", job_type: "Internship", required_skills: ["react"] }),
    makeJob({ title: "Backend Engineer", city: "Hyderabad", work_mode: "Remote", required_skills: ["node.js"] }),
  ];

  it("filters by city case-insensitively", () => {
    expect(filterJobs(jobs, { city: "chennai" }).map((j) => j.title)).toEqual(["Data Analyst"]);
  });
  it('treats city "remote" as remote work mode', () => {
    expect(filterJobs(jobs, { city: "Remote" }).map((j) => j.title)).toEqual(["Backend Engineer"]);
  });
  it("filters by job type", () => {
    expect(filterJobs(jobs, { job_type: "Internship" })).toHaveLength(1);
  });
  it("matches keywords against title and required skills, ignoring filler words", () => {
    expect(filterJobs(jobs, { keyword: "react jobs" }).map((j) => j.title)).toEqual(["Frontend Developer"]);
    expect(filterJobs(jobs, { keyword: "data analyst roles" }).map((j) => j.title)).toEqual(["Data Analyst"]);
  });
  it("returns everything with no filters", () => {
    expect(filterJobs(jobs, {})).toHaveLength(3);
  });
});

describe("rankMatches", () => {
  it("orders eligible first, then by score, then by soonest deadline", () => {
    const profile = makeProfile();
    const ineligible = evaluateJob(makeJob({ id: 101, min_cgpa: 9.9, required_skills: [] }), profile, undefined, TODAY);
    const strongLate = evaluateJob(makeJob({ id: 102, apply_by: "2026-11-30" }), profile, undefined, TODAY);
    const strongSoon = evaluateJob(makeJob({ id: 103, apply_by: "2026-11-14" }), profile, undefined, TODAY);
    const weak = evaluateJob(makeJob({ id: 104, required_skills: ["java"] }), profile, undefined, TODAY);
    expect(rankMatches([ineligible, weak, strongLate, strongSoon]).map((m) => m.job_id)).toEqual([103, 102, 104, 101]);
  });
  it("does not mutate its input", () => {
    const input = [evaluateJob(makeJob(), makeProfile(), undefined, TODAY)];
    const copy = [...input];
    rankMatches(input);
    expect(input).toEqual(copy);
  });
});

describe("countStrongMatches", () => {
  it("counts eligible jobs with every required skill", () => {
    const jobs = [makeJob(), makeJob({ required_skills: ["java"] }), makeJob({ min_cgpa: 9.5 })];
    expect(countStrongMatches(jobs, makeProfile(), undefined, TODAY)).toBe(1);
    expect(countStrongMatches(jobs, makeProfile(), ["python", "sql", "java"], TODAY)).toBe(2);
  });
});

describe("buildSkillGapPlan (Skill ROI)", () => {
  const profile = makeProfile({ skills: ["python"] });
  const jobs = [
    makeJob({ title: "A", required_skills: ["python", "react"], nice_to_have: [] }),
    makeJob({ title: "B", required_skills: ["python", "react"], nice_to_have: [] }),
    makeJob({ title: "C", required_skills: ["react", "docker"], nice_to_have: ["aws"] }),
    makeJob({ title: "Closed", required_skills: ["kotlin"], apply_by: "2026-01-01" }),
  ];

  it("ranks the skill that unlocks the most jobs first", () => {
    const plan = buildSkillGapPlan(jobs, profile, 5, TODAY);
    expect(plan.jobs_considered).toBe(3);
    const react = plan.top_skills_to_learn[0];
    expect(react.skill).toBe("react");
    expect(react.required_in_jobs).toBe(3);
    expect(react.jobs_fully_unlocked).toBe(2); // A and B; C still needs docker
  });
  it("ignores skills that only appear in ineligible jobs", () => {
    const plan = buildSkillGapPlan(jobs, profile, 10, TODAY);
    expect(plan.top_skills_to_learn.map((s) => s.skill)).not.toContain("kotlin");
  });
  it("reports a positive average score gain and respects the limit", () => {
    const plan = buildSkillGapPlan(jobs, profile, 2, TODAY);
    expect(plan.top_skills_to_learn).toHaveLength(2);
    expect(plan.top_skills_to_learn.every((s) => s.avg_score_gain > 0)).toBe(true);
  });
});

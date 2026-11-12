import { describe, expect, it } from "vitest";
import { toFunctionDeclarations } from "./defineTool";
import { retryAfterMs } from "./runAgentGroq";
import { runTool } from "./runTool";
import { tools } from "./tools";

describe("agent tools", () => {
  it("exposes the 10 tools, 4 of which write", () => {
    expect(tools.map((t) => t.name)).toEqual([
      "getMyProfile",
      "searchJobs",
      "scoreJobMatch",
      "getSkillGapPlan",
      "whatIfLearnSkill",
      "getMyShortlist",
      "saveToShortlist",
      "updateMySkills",
      "updateApplicationStatus",
      "saveCoverNote",
    ]);
    expect(tools.filter((t) => t.writes).map((t) => t.name)).toEqual(["saveToShortlist", "updateMySkills", "updateApplicationStatus", "saveCoverNote"]);
  });

  it("produces function declarations with only provider-supported JSON Schema keys", () => {
    const allowed = new Set(["type", "properties", "required", "description", "enum", "items", "nullable", "format"]);
    const walk = (node: unknown): void => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(walk); // e.g. enum values, required names
      for (const [key, value] of Object.entries(node)) {
        if (key !== "properties") expect(allowed.has(key)).toBe(true);
        if (key === "properties") Object.values(value as object).forEach(walk);
        else walk(value);
      }
    };
    for (const d of toFunctionDeclarations(tools)) {
      expect(d.description?.length).toBeGreaterThan(20);
      walk(d.parametersJsonSchema);
    }
  });
});

describe("runTool (the Zod gate between the model and the database)", () => {
  it("refuses unknown tools", async () => {
    const step = await runTool("dropAllTables", {});
    expect(step).toMatchObject({ ok: false, error: "Unknown tool: dropAllTables" });
  });
  it("rejects invalid arguments before any code runs", async () => {
    const step = await runTool("scoreJobMatch", { job_id: "abc" });
    expect(step.ok).toBe(false);
    expect(step.error).toMatch(/^Invalid arguments: job_id/);
  });
  it("enforces limits in schemas (max 5 jobs per save)", async () => {
    const step = await runTool("saveToShortlist", { job_ids: [1, 2, 3, 4, 5, 6] });
    expect(step).toMatchObject({ ok: false, writes: true });
  });
  it("rejects a cover note that is too short", async () => {
    const step = await runTool("saveCoverNote", { job_id: 1, note: "Hire me." });
    expect(step.error).toMatch(/note/);
  });
});

describe("retryAfterMs (Groq rate-limit parsing)", () => {
  it.each([
    ["Please try again in 794ms.", 794],
    ["Please try again in 13.8s.", 13_800],
    ["Please try again in 1m2.5s.", 62_500],
  ])("parses %s", (msg, ms) => {
    expect(retryAfterMs(msg)).toBeCloseTo(ms);
  });
  it("returns Infinity when no wait time is given", () => {
    expect(retryAfterMs("Rate limit reached")).toBe(Infinity);
  });
});

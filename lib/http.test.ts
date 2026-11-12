import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { BusinessRuleError, DatabaseError, NotFoundError } from "./errors";
import { errorResponse, handle, parseBody, parseQuery } from "./http";

vi.mock("./logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const body = async (res: Response) => ({ status: res.status, json: await res.json() });

describe("errorResponse", () => {
  it("maps typed errors to their status and message", async () => {
    expect(await body(errorResponse(new NotFoundError("No job found with id 9"), "t"))).toEqual({ status: 404, json: { error: "No job found with id 9" } });
    expect((await body(errorResponse(new BusinessRuleError("Not eligible"), "t"))).status).toBe(422);
  });
  it("hides raw database details from the client", async () => {
    const res = await body(errorResponse(new DatabaseError('relation "secret_table" violates something'), "t"));
    expect(res.status).toBe(500);
    expect(res.json.error).not.toContain("secret_table");
  });
  it("gives setup guidance when tables are missing", async () => {
    const res = await body(errorResponse(new DatabaseError('relation "jobs" does not exist'), "t"));
    expect(res.json.error).toMatch(/seed\/ps6_job_match\.sql/);
  });
  it("turns provider rate limits into 429", async () => {
    expect((await body(errorResponse(Object.assign(new Error("RESOURCE_EXHAUSTED"), { status: 429 }), "t"))).status).toBe(429);
  });
  it("returns a generic 500 for unexpected errors outside development", async () => {
    const res = await body(errorResponse(new Error("TypeError: x is undefined"), "t"));
    expect(res).toEqual({ status: 500, json: { error: "Something went wrong. Please try again." } });
  });
});

describe("parseBody / parseQuery", () => {
  const schema = z.object({ job_id: z.number().int().positive() });
  const post = (raw: string) => new Request("http://x", { method: "POST", body: raw });

  it("returns typed data for a valid body", async () => {
    expect(await parseBody(post('{"job_id":3}'), schema)).toEqual({ job_id: 3 });
  });
  it("responds 400 with issues for invalid JSON or schema mismatch", async () => {
    const route = handle("t", async (req) => Response.json(await parseBody(req, schema)));
    const bad = await body(await route(post('{"job_id":-1}')));
    expect(bad.status).toBe(400);
    expect(bad.json.details[0].path).toEqual(["job_id"]);
    expect((await route(post("not json"))).status).toBe(400);
  });
  it("drops empty query values before validating", () => {
    const q = z.object({ city: z.string().optional() });
    expect(parseQuery(new Request("http://x/?city=&q="), q)).toEqual({});
  });
});

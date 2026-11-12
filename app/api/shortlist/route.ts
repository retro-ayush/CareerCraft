import { NextResponse } from "next/server";
import { BusinessRuleError } from "@/lib/errors";
import { handle, parseBody, parseQuery } from "@/lib/http";
import { shortlistAddSchema, shortlistDeleteQuerySchema, shortlistUpdateSchema } from "@/lib/schemas";
import { addToShortlist, getShortlist, removeFromShortlist, setApplicationStatus, setCoverNote } from "@/lib/shortlist";

export const runtime = "nodejs";

/*
 * GET    /api/shortlist                                   -> saved jobs with status and deadlines
 * POST   /api/shortlist   { job_id, reason? }             -> save a job (eligibility enforced) -> 201
 * PATCH  /api/shortlist   { job_id, status?, cover_note? } -> update status and/or cover note
 * DELETE /api/shortlist?job_id=12                         -> remove a job
 */

export const GET = handle("shortlist.list", async () => NextResponse.json({ shortlist: await getShortlist() }));

export const POST = handle("shortlist.add", async (request) => {
  const { job_id, reason } = await parseBody(request, shortlistAddSchema);
  const result = await addToShortlist([job_id], reason);
  if (result.saved.length === 0) throw new BusinessRuleError(result.skipped[0]?.why ?? "Could not save this job");
  return NextResponse.json(result, { status: 201 });
});

export const PATCH = handle("shortlist.update", async (request) => {
  const { job_id, status, cover_note } = await parseBody(request, shortlistUpdateSchema);
  if (status) await setApplicationStatus(job_id, status);
  if (cover_note !== undefined) await setCoverNote(job_id, cover_note);
  return NextResponse.json({ ok: true });
});

export const DELETE = handle("shortlist.remove", async (request) => {
  const { job_id } = parseQuery(request, shortlistDeleteQuerySchema, "job_id is required");
  return NextResponse.json(await removeFromShortlist(job_id));
});

import { NextResponse } from "next/server";
import { addToShortlist, getShortlist, removeFromShortlist, setApplicationStatus, setCoverNote } from "@/lib/shortlist";
import { shortlistAddSchema, shortlistUpdateSchema } from "@/lib/schemas";
import { apiError } from "@/lib/apiError";

export const runtime = "nodejs";

/*
 * GET    /api/shortlist                       -> saved jobs with status and deadlines
 * POST   /api/shortlist   { job_id, reason? } -> save a job (eligibility checked)
 * PATCH  /api/shortlist   { job_id, status?, cover_note? }
 * DELETE /api/shortlist?job_id=12
 */

export async function GET() {
  try {
    return NextResponse.json({ shortlist: await getShortlist() });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: Request) {
  const parsed = shortlistAddSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 });
  try {
    const result = await addToShortlist([parsed.data.job_id], parsed.data.reason);
    if (result.saved.length === 0) {
      return NextResponse.json({ error: result.skipped[0]?.why ?? "Could not save" }, { status: 422 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(request: Request) {
  const parsed = shortlistUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 });
  const { job_id, status, cover_note } = parsed.data;
  try {
    if (status) await setApplicationStatus(job_id, status);
    if (cover_note !== undefined) await setCoverNote(job_id, cover_note);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(request: Request) {
  const jobId = Number(new URL(request.url).searchParams.get("job_id"));
  if (!Number.isInteger(jobId) || jobId <= 0) return NextResponse.json({ error: "job_id is required" }, { status: 400 });
  try {
    return NextResponse.json(await removeFromShortlist(jobId));
  } catch (err) {
    return apiError(err);
  }
}

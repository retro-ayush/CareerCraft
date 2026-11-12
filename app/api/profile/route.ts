import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { CURRENT_STUDENT_ID, getProfile, normalizeSkills } from "@/lib/careermatch";
import { updateProfileSchema } from "@/lib/schemas";
import { apiError } from "@/lib/apiError";

export const runtime = "nodejs";

/** GET /api/profile -> the logged-in student's profile */
export async function GET() {
  try {
    return NextResponse.json({ profile: await getProfile() });
  } catch (err) {
    return apiError(err);
  }
}

/** PATCH /api/profile  body: { skills?, preferred_cities?, interests? } */
export async function PATCH(request: Request) {
  const parsed = updateProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile update", details: parsed.error.issues }, { status: 400 });
  }
  const update = { ...parsed.data, ...(parsed.data.skills ? { skills: normalizeSkills(parsed.data.skills) } : {}) };
  const { error } = await getSupabase().from("profiles").update(update).eq("id", CURRENT_STUDENT_ID);
  if (error) return apiError(error);
  return NextResponse.json({ profile: await getProfile() });
}

import { NextResponse } from "next/server";
import { getProfile, normalizeSkills, updateProfile } from "@/lib/careermatch";
import { handle, parseBody } from "@/lib/http";
import { updateProfileSchema } from "@/lib/schemas";

export const runtime = "nodejs";

/** GET /api/profile -> the logged-in student's profile. */
export const GET = handle("profile.get", async () => NextResponse.json({ profile: await getProfile() }));

/** PATCH /api/profile  body: { skills?, preferred_cities?, interests? } -> the updated profile. */
export const PATCH = handle("profile.update", async (request) => {
  const input = await parseBody(request, updateProfileSchema, "Invalid profile update");
  const profile = await updateProfile({ ...input, ...(input.skills ? { skills: normalizeSkills(input.skills) } : {}) });
  return NextResponse.json({ profile });
});

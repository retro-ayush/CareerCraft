import { NextResponse } from "next/server";
import { activeLlmProvider, optionalEnv } from "@/lib/env";
import type { HealthStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/health -> which settings are present (never their values) and the active LLM provider. */
export async function GET() {
  const has = (name: string) => Boolean(optionalEnv(name));
  const settings = {
    // GEMINI_MODEL / GROQ_MODEL are optional (they have defaults), so they are not checked.
    LLM_KEY: has("GROQ_API_KEY") || has("GEMINI_API_KEY"),
    SUPABASE_URL: has("SUPABASE_URL"),
    SUPABASE_SECRET_KEY: has("SUPABASE_SECRET_KEY"),
    APP_PASSCODE: has("APP_PASSCODE"),
  };
  const body: HealthStatus = { ok: Object.values(settings).every(Boolean), llm: activeLlmProvider(), settings };
  return NextResponse.json(body);
}

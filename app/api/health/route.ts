import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** GET /api/health  -> shows which settings are missing (never shows the values). */
export async function GET() {
  // GEMINI_MODEL is optional (it has a default), so it is not checked here.
  const has = (n: string) => Boolean(process.env[n]?.trim());
  const settings = {
    LLM_KEY: has("GROQ_API_KEY") || has("GEMINI_API_KEY"),
    SUPABASE_URL: has("SUPABASE_URL"),
    SUPABASE_SECRET_KEY: has("SUPABASE_SECRET_KEY"),
    APP_PASSCODE: has("APP_PASSCODE"),
  };
  const llm = has("GROQ_API_KEY") ? "groq" : has("GEMINI_API_KEY") ? "gemini" : "none";
  return NextResponse.json({ ok: Object.values(settings).every(Boolean), llm, settings });
}

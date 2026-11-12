import "server-only";
import { ConfigError } from "./errors";

/**
 * Server-side configuration. Every secret is read here, on the server only; none reaches the browser.
 * Variables are read lazily so the app builds without them and fails with a clear message when used.
 */

/** Returns a trimmed environment variable, or throws a ConfigError naming what is missing. */
export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new ConfigError(`Missing environment variable ${name}. Add it to .env.local (and to the Vercel project settings).`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export const GEMINI_MODEL = optionalEnv("GEMINI_MODEL") ?? "gemini-3.8-flash";
export const GROQ_MODEL = optionalEnv("GROQ_MODEL") ?? "openai/gpt-oss-120b";

export type LlmProvider = "groq" | "gemini" | "none";

/** Groq wins when both keys are set (faster, generous free tier); Gemini is the fallback. */
export function activeLlmProvider(): LlmProvider {
  if (optionalEnv("GROQ_API_KEY")) return "groq";
  if (optionalEnv("GEMINI_API_KEY")) return "gemini";
  return "none";
}

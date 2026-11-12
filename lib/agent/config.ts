/** Agent loop limits, shared by the Gemini and Groq runners. */

/** Max model round-trips per request. Stops runaway loops and protects the API quota. */
export const MAX_TOOL_ROUNDS = { gemini: 5, groq: 6 } as const;

export const TEMPERATURE = 0.2;

/** Per-request timeout for the LLM HTTP call (Vercel caps the route at 60s). */
export const LLM_TIMEOUT_MS = 25_000;

export const FALLBACK_REPLY = "Sorry, I could not answer that.";
export const TOO_MANY_STEPS_REPLY = "I needed too many steps for this request. Please try a simpler or more specific question.";

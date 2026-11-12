import { NextResponse } from "next/server";
import type { z } from "zod";
import { AppError, DatabaseError, ValidationError } from "./errors";
import { logger } from "./logger";

/** Validation failure that also carries the Zod issues, returned as `details`. */
export class RequestValidationError extends ValidationError {
  constructor(
    message: string,
    readonly issues: z.core.$ZodIssue[]
  ) {
    super(message);
  }
}

function isRateLimit(err: unknown): boolean {
  const status = typeof err === "object" && err && "status" in err ? Number((err as { status: unknown }).status) : undefined;
  const message = err instanceof Error ? err.message : "";
  return status === 429 || /RESOURCE_EXHAUSTED|rate limit|quota/i.test(message);
}

/**
 * Converts any thrown value into a JSON error response `{ error, details? }`.
 * - AppError: its own status and user-safe message.
 * - Rate limits from the LLM provider: 429 with a friendly message.
 * - Anything else: logged with context, 500 with a generic message (raw details only in development).
 */
export function errorResponse(err: unknown, context: string): NextResponse {
  if (err instanceof RequestValidationError) {
    return NextResponse.json({ error: err.message, details: err.issues }, { status: err.status });
  }
  if (err instanceof AppError) {
    if (err instanceof DatabaseError) logger.error("db_error", { context, detail: err.detail, pgCode: err.pgCode });
    else if (err.status >= 500) logger.error("app_error", { context, code: err.code, message: err.message });
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (isRateLimit(err)) {
    logger.warn("rate_limited", { context });
    return NextResponse.json({ error: "The AI rate limit was reached. Wait a minute and try again." }, { status: 429 });
  }

  const message = err instanceof Error ? err.message : String(err);
  logger.error("unhandled_error", { context, message, stack: err instanceof Error ? err.stack : undefined });
  const exposed = process.env.NODE_ENV === "development" ? message : "Something went wrong. Please try again.";
  return NextResponse.json({ error: exposed }, { status: 500 });
}

/**
 * Wraps a route handler so every thrown error becomes a consistent JSON response.
 * Usage: `export const GET = handle("jobs.list", async (req) => NextResponse.json(...))`
 */
export function handle(context: string, handler: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    try {
      return await handler(request);
    } catch (err) {
      return errorResponse(err, context);
    }
  };
}

/** Parses and validates a JSON body. Throws RequestValidationError (400) on bad JSON or schema mismatch. */
export async function parseBody<S extends z.ZodType>(request: Request, schema: S, label = "Invalid request"): Promise<z.infer<S>> {
  const json: unknown = await request.json().catch(() => undefined);
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new RequestValidationError(label, parsed.error.issues);
  return parsed.data;
}

/** Validates URL query parameters (empty values are dropped first). */
export function parseQuery<S extends z.ZodType>(request: Request, schema: S, label = "Invalid query"): z.infer<S> {
  const params = Object.fromEntries([...new URL(request.url).searchParams.entries()].filter(([, v]) => v.trim() !== ""));
  const parsed = schema.safeParse(params);
  if (!parsed.success) throw new RequestValidationError(label, parsed.error.issues);
  return parsed.data;
}

/**
 * Typed application errors. Domain code throws these; the HTTP layer (lib/http.ts)
 * maps them to status codes, so routes never guess the status from message text.
 * Messages on AppError are written for end users and are safe to return to the client.
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, "not_found");
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "validation_error");
  }
}

/** The request is valid but breaks a business rule (e.g. saving an ineligible job). */
export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(message, 422, "business_rule");
  }
}

export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, 500, "config_error");
  }
}

export class UpstreamError extends AppError {
  constructor(message: string, status = 502) {
    super(message, status, "upstream_error");
  }
}

/** Database failure. The raw driver message is kept for logs but not shown to users. */
export class DatabaseError extends AppError {
  constructor(
    readonly detail: string,
    readonly pgCode?: string
  ) {
    super(
      /schema cache|does not exist/i.test(detail)
        ? "Database tables are missing. Run seed/ps6_job_match.sql and seed/ps6_careermatch_extras.sql in the Supabase SQL Editor."
        : "A database error occurred. Please try again.",
      500,
      "database_error"
    );
  }
}

/** Wraps a Supabase/PostgREST error object in a DatabaseError. */
export function dbError(err: { message: string; code?: string }): DatabaseError {
  return new DatabaseError(err.message, err.code);
}

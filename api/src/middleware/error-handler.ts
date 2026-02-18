/**
 * Centralized error handling middleware
 * Catches all errors, logs them, and returns consistent JSON responses
 */

import { Context } from "hono";
import { ZodError } from "zod";
import { Sentry } from "@/lib/sentry";
import { AppError } from "@/infrastructure/errors";
import { logger } from "@/utils/logger";
import { env } from "@/config/env";

/**
 * Format Zod validation errors into a readable structure
 */
function formatZodError(error: ZodError) {
  return error.issues.map((err) => ({
    path: err.path.join("."),
    message: err.message,
  }));
}

/**
 * Check if error is a Postgres constraint violation
 * Returns appropriate error details if it is
 */
function handleDatabaseError(error: unknown): {
  statusCode: number;
  code: string;
  message: string;
} | null {
  // Check for Postgres error codes
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    const pgError = error as { code: string; detail?: string; constraint?: string };

    // 23505 = unique_violation
    if (pgError.code === "23505") {
      return {
        statusCode: 409,
        code: "CONFLICT",
        message: "Resource already exists",
      };
    }

    // 23503 = foreign_key_violation
    if (pgError.code === "23503") {
      return {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Referenced resource does not exist",
      };
    }

    // 23502 = not_null_violation
    if (pgError.code === "23502") {
      return {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Required field is missing",
      };
    }
  }

  return null;
}

/**
 * Report error to Sentry if enabled
 * Only reports operational errors and 5xx errors
 * 
 * Note: User context is already set by sentryContext middleware,
 * so we don't need to set it again here.
 */
function reportToSentry(err: Error, context: Record<string, unknown>, statusCode: number): void {
  if (!env.SENTRY_DSN) {
    return;
  }

  // Don't report 4xx client errors (except 429 rate limit)
  if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
    return;
  }

  // For AppError, only report operational errors
  if (err instanceof AppError && !err.isOperational) {
    return;
  }

  // Set fingerprint for better error grouping
  const fingerprint = err instanceof AppError 
    ? [err.code, context.path as string]
    : ["{{ default }}", context.path as string];

  // Capture exception
  // User context, tags, and breadcrumbs are already set by sentryContext middleware
  Sentry.captureException(err, {
    level: statusCode >= 500 ? "error" : "warning",
    fingerprint,
    tags: {
      statusCode: statusCode.toString(),
    },
  });
}

/**
 * Error handling middleware for Hono
 * Must be registered as the last middleware in the chain
 */
export async function errorHandler(err: Error, c: Context) {
  // Extract request context for logging
  const requestContext = {
    method: c.req.method,
    path: c.req.path,
    userId: c.get("auth")?.userId,
  };

  // Handle AppError instances (our custom errors)
  if (err instanceof AppError) {
    logger.error(
      {
        ...requestContext,
        error: err.message,
        code: err.code,
        statusCode: err.statusCode,
        details: err.details,
        stack: env.NODE_ENV === "development" ? err.stack : undefined,
      },
      "Application error"
    );

    // Report to Sentry
    reportToSentry(err, requestContext, err.statusCode);

    const responseBody: Record<string, unknown> = {
      error: err.code,
      message: err.message,
    };

    if (err.details) {
   responseBody.details = err.details;
    }

    if (env.NODE_ENV === "development") {
      responseBody.stack = err.stack;
    }

    return c.json(responseBody, err.statusCode as any);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = formatZodError(err);

    logger.warn(
      {
        ...requestContext,
        validationErrors: formattedErrors,
      },
      "Validation error"
    );

    return c.json(
      {
        error: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: formattedErrors,
      },
      400
    );
  }

  // Handle database errors
  const dbError = handleDatabaseError(err);
  if (dbError) {
    logger.error(
      {
        ...requestContext,
        error: err.message,
        code: dbError.code,
      },
      "Database error"
    );

    // Report to Sentry
    reportToSentry(err, requestContext, dbError.statusCode);

    return c.json(
      {
        error: dbError.code,
        message: dbError.message,
      },
      dbError.statusCode as any
    );
  }

  // Handle unknown errors (500 Internal Server Error)
  logger.error(
    {
      ...requestContext,
      error: err.message,
      stack: err.stack,
      name: err.name,
    },
    "Unhandled error"
  );

  // Report to Sentry
  reportToSentry(err, requestContext, 500);

  // Don't leak internal error details in production
  const message =
    env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";

  const responseBody: Record<string, unknown> = {
    error: "INTERNAL_ERROR",
    message,
  };

  if (env.NODE_ENV === "development") {
    responseBody.stack = err.stack;
  }

  return c.json(responseBody, 500 as any);
}

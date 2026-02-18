/**
 * Sentry initialization and configuration
 * Provides error tracking, performance monitoring, and distributed tracing
 */

import * as Sentry from "@sentry/node";
import { env } from "../config/env.js";

// Initialize Sentry only if DSN is provided
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
    tracesSampleRate:
      env.SENTRY_TRACES_SAMPLE_RATE ??
      (env.NODE_ENV === "production" ? 0.1 : 1.0),
    sendDefaultPii: true, // Enable IP collection and user context
    integrations: [
      // Add Node.js integrations
      Sentry.httpIntegration(),
      Sentry.nativeNodeFetchIntegration(),
    ],
  });
}

// Export Sentry instance for use throughout the application
export { Sentry };

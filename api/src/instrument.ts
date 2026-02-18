/**
 * Sentry instrumentation - MUST be imported first
 * This file initializes Sentry before any other code runs
 * to ensure proper error tracking and performance monitoring
 */

import * as Sentry from "@sentry/node";

// Initialize Sentry as early as possible
// Environment variables are accessed directly here since env.ts imports other modules
const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV || "development";
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || NODE_ENV;
const SENTRY_TRACES_SAMPLE_RATE = process.env.SENTRY_TRACES_SAMPLE_RATE
  ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE)
  : NODE_ENV === "production"
    ? 0.1
    : 1.0;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    sendDefaultPii: true, // Enable IP collection and user context

    // Integrations for Node.js
    integrations: [
      Sentry.httpIntegration(),
      Sentry.nativeNodeFetchIntegration(),
    ],

    // Better error grouping
    beforeSend(event) {
      // Add custom fingerprinting logic if needed
      return event;
    },
  });

  console.log(`✅ Sentry initialized (${SENTRY_ENVIRONMENT})`);
} else {
  console.log("⚠️  Sentry DSN not configured - error tracking disabled");
}

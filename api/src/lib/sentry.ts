/**
 * Sentry re-export for use in middleware and error handlers
 * 
 * Note: Sentry is initialized in instrument.ts which is imported first in index.ts
 * This file just re-exports the Sentry instance for use throughout the application
 */

import * as Sentry from "@sentry/node";

// Export Sentry instance for use throughout the application
export { Sentry };

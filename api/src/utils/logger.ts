/**
 * Centralized logging utility using pino
 * Provides structured logging with environment-specific configuration
 */

import pino from "pino";
import { env } from "../config/env.js";

// Configure pino logger based on environment
export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  base: {
    env: env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Export typed logger interface for better IDE support
export type Logger = typeof logger;

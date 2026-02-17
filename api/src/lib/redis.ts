/**
 * Redis client configuration
 * Used for rate limiting with sliding window algorithm
 */

import Redis from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * Redis client instance
 * Configured with automatic reconnection and error handling
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      // Only reconnect when the error contains "READONLY"
      return true;
    }
    return false;
  },
});

// Connection event handlers
redis.on("connect", () => {
  logger.info("Redis client connecting...");
});

redis.on("ready", () => {
  logger.info("Redis client connected and ready");
});

redis.on("error", (err) => {
  logger.error({ err }, "Redis client error");
});

redis.on("close", () => {
  logger.info("Redis client connection closed");
});

redis.on("reconnecting", () => {
  logger.warn("Redis client reconnecting...");
});

/**
 * Gracefully close Redis connection
 */
export async function closeRedis(): Promise<void> {
  try {
    await redis.quit();
    logger.info("Redis connection closed gracefully");
  } catch (err) {
    logger.error({ err }, "Error closing Redis connection");
    // Force close if graceful shutdown fails
    redis.disconnect();
  }
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (err) {
    return false;
  }
}

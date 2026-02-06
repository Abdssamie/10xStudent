/**
 * @id: bullmq-queues
 * @priority: high
 * @progress: 0
 * @directive: Implement BullMQ background jobs for credit reset and embedding generation
 * @context: specs/01-database-api-foundation.md#cron-jobs, specs/04-source-management-rag.md#background-embedding-job
 * @checklist: [
 *   "Create Redis connection for BullMQ",
 *   "Create creditResetQueue for monthly credit resets",
 *   "Create embeddingQueue for async embedding generation",
 *   "Implement startCreditResetWorker to reset all users' credits to 10,000",
 *   "Implement scheduleMonthlyCreditsReset with cron pattern '0 0 1 * *'",
 *   "Implement startEmbeddingWorker to process sources without embeddings",
 *   "Implement scheduleEmbeddingJob to run every 30 seconds",
 *   "Process sources in batches of 10 per job",
 *   "Generate embeddings using Google text-embedding-004 API",
 *   "Update sources with generated embeddings",
 *   "Log job progress and failures with Pino",
 *   "Configure automatic retry with exponential backoff (max 3 attempts)"
 * ]
 * @deps: ["users-schema", "sources-schema", "embedding-service"]
 * @skills: ["bullmq", "redis", "drizzle-orm", "typescript"]
 */
export const _hole = null;

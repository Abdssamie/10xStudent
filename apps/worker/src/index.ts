import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { processor } from './processor';

/**
 * @id: worker-instance
 * @priority: high
 * @progress: 90
 * @spec: BullMQ Worker instance. Connects to Redis, listens to 'compilation-queue'.
 * @skills: ["bullmq", "redis"]
 */

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

export const worker = new Worker('compilation-queue', processor, {
    connection,
    concurrency: 5, // Process 5 compilations in parallel
});

worker.on('completed', (job: Job) => {
    console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`Job ${job?.id} failed:`, err);
});

console.log('Worker started, listening for jobs...');


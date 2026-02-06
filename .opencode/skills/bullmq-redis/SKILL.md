---
name: bullmq-redis
description: Use when implementing background job processing with BullMQ and Redis, setting up job queues, configuring workers, implementing retry strategies, monitoring queue health, or handling job failures
---

# BullMQ Redis Job Queue

## Overview

BullMQ is a Node.js library for robust, Redis-backed job queues with exactly-once semantics, horizontal scaling, and high performance. Built for microservices architectures requiring distributed job processing, delayed tasks, retries, and concurrency control.

## Quick Start

```typescript
import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";

// Redis connection (reuse across queue/worker)
const connection = new IORedis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null, // Required for BullMQ
});

// Create queue
const queue = new Queue("emails", { connection });

// Add job
await queue.add(
  "send-welcome",
  { to: "user@example.com", template: "welcome" },
  {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  },
);

// Create worker
const worker = new Worker(
  "emails",
  async (job: Job) => {
    console.log(`Processing ${job.name}:`, job.data);
    await sendEmail(job.data);
    return { sent: true };
  },
  { connection, concurrency: 5 },
);

// Event handlers
worker.on("completed", (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});

worker.on("error", (err) => {
  console.error("Worker error:", err);
});
```

## Core Concepts

| Concept         | Description                                     | Example                                               |
| --------------- | ----------------------------------------------- | ----------------------------------------------------- |
| **Queue**       | Job storage and management                      | `new Queue('tasks', { connection })`                  |
| **Worker**      | Job processor with concurrency                  | `new Worker('tasks', processor, { concurrency: 10 })` |
| **Job**         | Unit of work with data and options              | `queue.add('name', data, options)`                    |
| **Backoff**     | Retry delay strategy (fixed/exponential/custom) | `{ type: 'exponential', delay: 1000 }`                |
| **Priority**    | Job execution order (higher = sooner)           | `{ priority: 10 }`                                    |
| **Delay**       | Postpone job execution                          | `{ delay: 5000 }` (5 seconds)                         |
| **Concurrency** | Parallel job processing limit                   | `{ concurrency: 20 }`                                 |
| **QueueEvents** | Global event listener for monitoring            | `new QueueEvents('tasks')`                            |

## Common Patterns

### 1. Retry Strategies

```typescript
// Fixed backoff - retry every 3 seconds
await queue.add("task", data, {
  attempts: 5,
  backoff: { type: "fixed", delay: 3000 },
});

// Exponential backoff with jitter
await queue.add("task", data, {
  attempts: 8,
  backoff: {
    type: "exponential",
    delay: 1000, // 1s, 2s, 4s, 8s...
    jitter: 0.5, // Add 0-50% random variance
  },
});

// Custom backoff based on error type
const worker = new Worker("tasks", processor, {
  settings: {
    backoffStrategy: (attemptsMade, type, err, job) => {
      if (err?.message.includes("rate limit")) {
        return 60000; // Wait 1 minute
      }
      if (err?.message.includes("fatal")) {
        return -1; // Stop retrying
      }
      return Math.pow(2, attemptsMade - 1) * 1000;
    },
  },
});
```

### 2. Job Priorities and Delays

```typescript
// High priority job (processed first)
await queue.add("urgent-task", data, { priority: 10 });

// Low priority job
await queue.add("background-task", data, { priority: 1 });

// Delayed job (runs after 1 hour)
await queue.add("scheduled-task", data, {
  delay: 60 * 60 * 1000,
});

// Repeatable job (cron-like)
await queue.add("daily-report", data, {
  repeat: { pattern: "0 9 * * *" }, // Every day at 9 AM
});
```

### 3. Concurrency and Rate Limiting

```typescript
// Worker with local concurrency
const worker = new Worker("tasks", processor, {
  connection,
  concurrency: 10, // Process 10 jobs at once
  limiter: {
    max: 100, // Max 100 jobs
    duration: 60000, // Per minute
  },
});

// Global concurrency (across all workers)
await queue.setGlobalConcurrency(5); // Max 5 jobs globally

// Dynamic concurrency adjustment
worker.concurrency = 20;

// Remove global limit
await queue.removeGlobalConcurrency();
```

### 4. Queue Monitoring

```typescript
import { QueueEvents } from "bullmq";

// Global event listener
const queueEvents = new QueueEvents("tasks", { connection });

queueEvents.on("completed", ({ jobId, returnvalue }) => {
  console.log(`Job ${jobId} completed:`, returnvalue);
});

queueEvents.on("failed", ({ jobId, failedReason }) => {
  console.error(`Job ${jobId} failed:`, failedReason);
});

queueEvents.on("progress", ({ jobId, data }) => {
  console.log(`Job ${jobId} progress:`, data);
});

// Get queue metrics
const counts = await queue.getJobCounts(
  "waiting",
  "active",
  "completed",
  "failed",
  "delayed",
);
console.log("Queue status:", counts);

// Get jobs by state
const failedJobs = await queue.getFailed(0, 10);
const activeJobs = await queue.getActive(0, 10);

// Retry failed job
const job = await Job.fromId(queue, "job-id");
await job.retry();
```

## Quick Reference

### Redis Connection

```typescript
// Shared connection (recommended)
const connection = new IORedis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null, // Required!
  password: "optional",
  db: 0,
});
```

### Job Options

```typescript
{
  attempts: 3,              // Retry count
  backoff: { type, delay }, // Retry strategy
  priority: 5,              // Higher = sooner
  delay: 5000,              // Postpone (ms)
  removeOnComplete: true,   // Auto-cleanup
  removeOnFail: false,      // Keep failed jobs
  timeout: 30000,           // Job timeout (ms)
  repeat: { pattern }       // Cron schedule
}
```

### Worker Events

- `completed` - Job finished successfully
- `failed` - Job failed (after retries)
- `progress` - Job reported progress
- `error` - Worker error (must handle!)
- `drained` - Queue empty

### Graceful Shutdown

```typescript
process.on("SIGTERM", async () => {
  await worker.close();
  await queue.close();
  process.exit(0);
});
```

## Common Mistakes

**Missing maxRetriesPerRequest: null**

- BullMQ requires this Redis option
- Without it, jobs may fail unexpectedly

**No error handler on worker**

- Worker stops processing without `worker.on('error', ...)`
- Always attach error listener

**Not reusing Redis connections**

- Create one connection, share across Queue/Worker
- Reduces connection overhead

**Ignoring failed jobs**

- Monitor failed jobs regularly
- Implement retry logic or manual intervention

**Blocking operations in processor**

- Use async/await for I/O operations
- Don't block the event loop

**Not setting job timeouts**

- Jobs can hang indefinitely
- Always set reasonable timeout values

## Real-World Impact

- **Horizontal scaling**: Add workers across machines, all respect global concurrency
- **Resilience**: Automatic retries with exponential backoff reduce transient failures
- **Performance**: Process 1000s of jobs/second with proper concurrency tuning
- **Observability**: QueueEvents provide real-time monitoring without polling
- **Resource control**: Rate limiting prevents overwhelming external APIs

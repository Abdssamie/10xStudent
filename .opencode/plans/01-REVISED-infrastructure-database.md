# Phase 1: Infrastructure & Database Foundation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up Docker infrastructure, run database migrations, configure BullMQ worker for async embeddings, and create Typst templates package.

**Architecture:** Docker Compose with pgvector PostgreSQL, Typst CLI container, Redis for BullMQ, async embedding generation worker.

**Tech Stack:** Docker, PostgreSQL 16, pgvector, Redis 7, Typst CLI v0.12.0+, BullMQ, Drizzle ORM

---

## Prerequisites

- Docker and Docker Compose installed
- Bun package manager installed
- Project root: `/home/abdssamie/ChemforgeProjects/10xStudent`

---

## Task 1: Fix PostgreSQL Docker Image for pgvector

**Files:**

- Modify: `docker-compose.yml:2-31`

**Context:** Current setup uses `postgres:18-bookworm` which doesn't include pgvector extension. Spec requires `pgvector/pgvector:pg16` for 768-dimensional embeddings.

**Step 1: Update postgres service**

Replace postgres service in `docker-compose.yml`:

```yaml
postgres:
  image: pgvector/pgvector:pg16
  container_name: 10xstudent-postgres
  ports:
    - "${POSTGRES_PORT:-5440}:5432"
  environment:
    POSTGRES_USER: ${POSTGRES_USER:-postgres}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-secure-password}
    POSTGRES_DB: ${POSTGRES_DB:-10xstudent}
  volumes:
    - postgres_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 10s
  restart: unless-stopped
```

**Step 2: Test postgres service**

Run: `docker-compose up postgres -d`

**Step 3: Verify pgvector extension**

Run: `docker-compose exec postgres psql -U postgres -d 10xstudent -c "CREATE EXTENSION IF NOT EXISTS vector;"`

Expected: `CREATE EXTENSION` or notice that it already exists

**Step 4: Commit**

```bash
git add docker-compose.yml
git commit -m "fix(docker): use pgvector/pgvector:pg16 for vector embeddings"
```

---

## Task 2: Create Typst Compilation Docker Container

**Files:**

- Create: `apps/api/Dockerfile.typst`

**Context:** Typst CLI must run in Docker for server-side compilation with full feature support (packages, fonts, imports).

**Step 1: Create Dockerfile.typst**

Create `apps/api/Dockerfile.typst`:

```dockerfile
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

# Install Typst CLI v0.12.0
RUN curl -fsSL https://github.com/typst/typst/releases/download/v0.12.0/typst-x86_64-unknown-linux-musl.tar.xz \
    | tar -xJ -C /usr/local/bin --strip-components=1

# Create directories
RUN mkdir -p /usr/share/fonts/custom \
    && mkdir -p /root/.local/share/typst/packages

WORKDIR /workspace

# Keep container running
CMD ["tail", "-f", "/dev/null"]
```

**Step 2: Build image**

Run: `docker build -f apps/api/Dockerfile.typst -t 10xstudent-typst:latest apps/api`

**Step 3: Test Typst CLI**

Run: `docker run --rm 10xstudent-typst:latest typst --version`

Expected: `typst 0.12.0`

**Step 4: Commit**

```bash
git add apps/api/Dockerfile.typst
git commit -m "feat(docker): add Typst CLI v0.12.0 container"
```

---

## Task 3: Add Typst and Redis Services to Docker Compose

**Files:**

- Modify: `docker-compose.yml`

**Context:** Add Typst compilation service and Redis for BullMQ background jobs.

**Step 1: Add typst service**

Add after postgres service:

```yaml
typst:
  build:
    context: ./apps/api
    dockerfile: Dockerfile.typst
  container_name: 10xstudent-typst
  volumes:
    - ./fonts:/usr/share/fonts/custom:ro
    - ./typst-packages:/root/.local/share/typst/packages:ro
    - ./tmp/typst-workspace:/workspace
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "typst", "--version"]
    interval: 30s
    timeout: 10s
    retries: 3
```

**Step 2: Add redis service**

Add after typst service:

```yaml
redis:
  image: redis:7-alpine
  container_name: 10xstudent-redis
  ports:
    - "${REDIS_PORT:-6379}:6379"
  command: redis-server --appendonly yes
  volumes:
    - redis_data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
  restart: unless-stopped
```

**Step 3: Add volumes**

Update volumes section:

```yaml
volumes:
  postgres_data:
  redis_data:
```

**Step 4: Create required directories**

Run: `mkdir -p fonts typst-packages tmp/typst-workspace`

**Step 5: Start all services**

Run: `docker-compose up -d`

**Step 6: Verify all services**

Run: `docker-compose ps`

Expected: All services "Up" and healthy

**Step 7: Commit**

```bash
git add docker-compose.yml
git commit -m "feat(docker): add Typst and Redis services"
```

---

## Task 4: Run Database Migrations

**Files:**

- None (migrations already exist in `packages/database/src/migrations/`)

**Context:** Database schema is already defined. Need to run migrations to create tables.

**Step 1: Check existing migrations**

Run: `ls packages/database/src/migrations/`

Expected: See migration files (0000*\*, 0001*\*, etc.)

**Step 2: Run migrations**

Run: `cd packages/database && bun run db:push`

Expected: Tables created successfully

**Step 3: Verify tables exist**

Run: `docker-compose exec postgres psql -U postgres -d 10xstudent -c "\dt"`

Expected: See tables: users, documents, sources, citations, credit_logs

**Step 4: Verify pgvector extension**

Run: `docker-compose exec postgres psql -U postgres -d 10xstudent -c "SELECT extname FROM pg_extension WHERE extname = 'vector';"`

Expected: `vector`

**Step 5: Commit (if any changes)**

```bash
git add packages/database/
git commit -m "chore(db): run database migrations"
```

---

## Task 5: Create BullMQ Embedding Worker

**Files:**

- Create: `apps/worker/src/jobs/generate-embeddings.ts`
- Modify: `apps/worker/src/index.ts`
- Modify: `apps/worker/package.json`

**Context:** Per Spec 4, embeddings must be generated asynchronously. BullMQ worker runs every 30 seconds to process sources with `embedding: null`.

**Step 1: Add dependencies to worker**

Modify `apps/worker/package.json`:

```json
{
  "dependencies": {
    "@10xstudent/database": "*",
    "bullmq": "^5.0.0",
    "ioredis": "^5.3.2",
    "pino": "^10.3.0"
  }
}
```

Run: `cd apps/worker && bun install`

**Step 2: Create embedding job processor**

Create `apps/worker/src/jobs/generate-embeddings.ts`:

```typescript
import { db } from "@10xstudent/database";
import { sources } from "@10xstudent/database/schema";
import { isNull } from "drizzle-orm";
import { logger } from "../logger";

/**
 * Generate embeddings for sources that don't have them yet
 * Uses Google text-embedding-004 (768 dimensions)
 */
export async function generateEmbeddingsJob() {
  const startTime = Date.now();

  // Find sources without embeddings
  const sourcesWithoutEmbeddings = await db
    .select()
    .from(sources)
    .where(isNull(sources.embedding))
    .limit(10); // Process 10 at a time

  if (sourcesWithoutEmbeddings.length === 0) {
    logger.info("No sources need embeddings");
    return { processed: 0 };
  }

  logger.info(
    `Processing ${sourcesWithoutEmbeddings.length} sources for embeddings`,
  );

  let successCount = 0;
  let errorCount = 0;

  for (const source of sourcesWithoutEmbeddings) {
    try {
      // Call Google Embedding API
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GOOGLE_API_KEY || "",
          },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: {
              parts: [{ text: source.content }],
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.statusText}`);
      }

      const data = await response.json();
      const embedding = data.embedding.values; // 768-dimensional array

      // Update source with embedding
      await db
        .update(sources)
        .set({ embedding: JSON.stringify(embedding) })
        .where(eq(sources.id, source.id));

      successCount++;
      logger.info(`Generated embedding for source ${source.id}`);
    } catch (error) {
      errorCount++;
      logger.error(
        `Failed to generate embedding for source ${source.id}:`,
        error,
      );
    }
  }

  const duration = Date.now() - startTime;
  logger.info(
    `Embedding job complete: ${successCount} success, ${errorCount} errors, ${duration}ms`,
  );

  return { processed: successCount, errors: errorCount, duration };
}
```

**Step 3: Set up BullMQ worker**

Modify `apps/worker/src/index.ts`:

```typescript
import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";
import { generateEmbeddingsJob } from "./jobs/generate-embeddings";
import { logger } from "./logger";

const connection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
  },
);

// Create queue
const embeddingQueue = new Queue("embeddings", { connection });

// Create worker
const worker = new Worker(
  "embeddings",
  async (job) => {
    logger.info(`Processing job ${job.id}`);
    return await generateEmbeddingsJob();
  },
  {
    connection,
    concurrency: 1,
  },
);

// Schedule recurring job (every 30 seconds)
async function scheduleEmbeddingJobs() {
  await embeddingQueue.add(
    "generate-embeddings",
    {},
    {
      repeat: {
        every: 30000, // 30 seconds
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );
  logger.info("Scheduled embedding generation job (every 30s)");
}

// Start worker
worker.on("completed", (job) => {
  logger.info(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  logger.error(`Job ${job?.id} failed:`, err);
});

// Initialize
scheduleEmbeddingJobs().catch((err) => {
  logger.error("Failed to schedule jobs:", err);
  process.exit(1);
});

logger.info("BullMQ worker started");
```

**Step 4: Create logger utility**

Create `apps/worker/src/logger.ts`:

```typescript
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});
```

**Step 5: Test worker**

Run: `cd apps/worker && bun run dev`

Expected: Worker starts, schedules job, logs "No sources need embeddings"

**Step 6: Commit**

```bash
git add apps/worker/
git commit -m "feat(worker): add BullMQ embedding generation worker"
```

---

## Task 6: Create Typst Templates Package

**Files:**

- Create: `packages/templates/research-paper.typ`
- Create: `packages/templates/report.typ`
- Create: `packages/templates/essay.typ`
- Create: `packages/templates/article.typ`
- Create: `ps/templates/notes.typ`
- Create: `packages/templates/index.ts`
- Create: `packages/templates/package.json`

**Context:** Per Spec 3, templates are code (not database). 5 templates required.

**Step 1: Create package.json**

Create `packages/templates/package.json`:

```json
{
  "name": "@10xstudent/templates",
  "version": "0.1.0",
  "main": "./index.ts",
  "types": "./index.ts"
}
```

**Step 2: Create research paper template**

Create `packages/templates/research-paper.typ`:

```typst
#set page(
  paper: "us-letter",
  margin: (x: 1in, y: 1in),
)

#set text(
  font: "New Computer Modern",
  size: 12pt,
)

#set par(
  justify: true,
  leading: 0.65em,
)

#set heading(numbering: "1.")

// Title
#align(center)[
  #text(size: 16pt, weight: "bold")[
    Your Research Paper Title
  ]

  #v(0.5em)

  Your Name \
  Institution \
  #link("mailto:your.email@example.com")

  #v(1em)
]

// Abstract
#heading(outlined: false)[Abstract]

Write your abstract here. This should be a brief summary of your research paper, typically 150-250 words.

#v(1em)

// Main content starts here
= Introduction

Write your introduction here.

= Literature Review

Review relevant literature here.

= Methodology

Describe your research methodology.

= Results

Present your findings.

= Discussion

Discuss your results.

= Conclusion

Conclude your paper.

// Bibliography will be auto-generated here by AI
#heading(outlined: false)[References]

// Citations will be inserted as footnotes by AI
```

**Step 3: Create other templates**

Create similar files for:

- `report.typ` (formal report structure)
- `essay.typ` (simple essay structure)
- `article.typ` (article/blog post structure)
- `notes.typ` (minimal note-taking structure)

**Step 4: Create index.ts**

Create `packages/templates/index.ts`:

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

export type TemplateType = 'research-paper' | 'report' | 'essay' | 'article' | 'notes';

export const templates: Record<TemplateType, string> = {
  'research-paper': readFileSync(join(__dirname, 'research-paper.typ'), 'utf-8'),
  'report': readFileSync(join(__dirname, 'report.typ'), 'utf-8'),
  'essay': readFileSync(join(__dirname, 'essay.typ'), 'utf-8'),
  'article': readFileSync(join(__dirname, 'article.typ'), 'utf-8'),
  'notes': readFileSync(join(__dirname, 'notes.typ'), 'utf-8'),
};

export function getTemplate(type: TemplateType): str
  return templates[type];
}
```

**Step 5: Commit**

```bash
git add packages/templates/
git commit -m "feat(templates): add 5 Typst document templates"
```

---

## Task 7: Update Environment Variables

**Files:**

- Modify: `.env.example`

**Context:** Add configuration for new services.

**Step 1: Add new variables**

Add to `.env.example`:

```bash
# ============================================
# TYPST COMPILATION
# ============================================
TYPST_COMPILE_TIMEOUT="30000"
TYPST_MAX_DOCUMENT_SIZE="100000"

# ============================================
# REDIS (BullMQ)
# ======================================
REDIS_URL="redis://localhost:6379"

# ============================================
# GOOGLE AI (Embeddings + Gemini)
# ============================================
GOOGLE_API_KEY="your-google-api-key"

# ============================================
# TAVILY (Web Search)
# ============================================
TAVILY_API_KEY="your-tavily-api-key"
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs(env): add Typst, Redis, and AI service variables"
```

---

## Verification Checklist

Before moving to Phase 2, verify:

- [ ] PostgreSQL uses `pgvector/pgvector:pg16` image
- [ ] pgvector extension is installed
- [ ] Typst CLI v0.12.0 runs in Docker
- [ ] Redis service is running
- [ ] All Docker services are healthy: `docker-compose ps`
- [ ] Database tables exist: `users`, `documents`, `sources`, `citations`, `credit_logs`
- [ ] BullMQ worker starts and schedules embedding job
- [ ] 5 Typst templates exist in `packages/templates/`
- [ ] All changes committed to git

---

## Next Steps

After completing Phase 1:

1. Proceed to Phase 2: `02-REVISED-backend-chat-endpoint.md`
2. Implement `/api/compile` endpoint
3. Implement `/api/chat` with server tools
4. Implement Clerk webhook handler

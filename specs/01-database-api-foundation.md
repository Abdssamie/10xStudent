# Spec 1: Database & API Foundation

## 1. Context

### Goal

Establish the foundational data layer and API infrastructure for 10xStudent. This includes database schema, authentication, CRUD operations, credit system, Clerk webhooks, credit reset background jobs (BullMQ + Redis), and the `/api/chat` endpoint with TanStack AI server tools.

**Key Architecture Decision (from Spec 0):** Server tools are NOT separate API endpoints. They execute within the `/api/chat` endpoint using the TanStack AI pattern, where the LLM orchestrates tool calls based on user messages.

### User Value

- Secure authentication with Clerk (automatic user creation via webhooks)
- Reliable data persistence for documents and sources
- Credit-based usage tracking to control AI costs (with automatic monthly resets)
- Type-safe API contracts for frontend consumption
- Single AI endpoint (`/api/chat`) for all LLM interactions
- Automatic citation numbering for academic documents
- Vector-based semantic search for sources

### Dependencies

- PostgreSQL (self-hosted) with pgvector extension
- Drizzle ORM
- Clerk authentication (with webhooks)
- Next.js API routes (for /api/chat and webhooks)
- Hono API framework (for REST endpoints)
- TanStack AI (for server tools)
- Zod validation
- Pino logger
- Vercel Cron (for credit resets)

### Reference

This spec implements the data layer and API foundation described in **Spec 0: System Architecture**. See Spec 0 for the overall architecture and tool execution patterns.

---

## 2. User Stories (Prioritized)

### P1: Authentication

- **US-01**: As a user, I want to sign in with Clerk, so that my documents are private and secure.
- **US-02**: As a user, I want authentication required immediately on app load, so that no unauthorized access occurs.

### P1: Document Management

- **US-03**: As a user, I want to create a new document, so that I can start working on content.
- **US-04**: As a user, I want to save my document content, so that my work is persisted.
- **US-05**: As a user, I want to view a list of my documents, so that I can access previous work.
- **US-06**: As a user, I want to delete documents, so that I can remove unwanted content.

### P1: Source Management

- **US-07**: As a user, I want sources to be stored with metadata, so that I can reference them later.
- **US-08**: As a user, I want to manually add sources, so that I can include references not found by AI.

### P1: Credit System

- **US-09**: As a user, I want to see my credit balance, so that I know how much AI usage I have left.
- **US-10**: As a user, I want credits to be deducted based on token usage, so that costs are fair.
- **US-11**: As a user, I want to be blocked from AI operations when out of credits, so that I don't incur unexpected costs.
- **US-12**: As a new user, I want to automatically receive 10,000 credits when I sign up, so that I can start using the app immediately.
- **US-13**: As a user, I want my credits to reset to 10,000 on the 1st of each month, so that I have a fresh allocation.

### P1: Citation Management

- **US-14**: As a user, I want citations to be numbered automatically, so that I can reference them in my document.

---

## 3. Functional Requirements (Testable)

### Authentication (Clerk)

- **FR-01**: System MUST integrate Clerk for authentication.
- **FR-02**: System MUST require authentication immediately on app load (no anonymous access).
- **FR-03**: System MUST extract userId from Clerk JWT in API middleware.
- **FR-04**: System MUST reject unauthenticated API requests with 401 status.
- **FR-05**: System MUST handle Clerk `user.created` webhook to create user records.
- **FR-06**: System MUST verify webhook signatures using Clerk's signing secret.

### Database Schema

- **FR-07**: System MUST use PostgreSQL with Drizzle ORM.
- **FR-08**: System MUST define schema for:
  - `users` table (userId, credits, creditsResetAt, preferences, createdAt, updatedAt)
  - `documents` table (id, userId, title, typstContent, template, citationFormat, citationCount, createdAt, updatedAt)
  - `sources` table (id, documentId, url, title, author, publicationDate, accessDate, content, embedding, metadata)
  - `credit_logs` table (id, userId, operation, cost, tokensUsed, timestamp)
- **FR-09**: System MUST use pgvector extension for source embeddings (768 dimensions for Google text-embedding-004).
- **FR-10**: System MUST enforce 1000-line limit on typstContent (server-side validation).
- **FR-11**: System MUST use indexes on userId, documentId, and createdAt for performance.
- **FR-12**: System MUST enable pgvector extension via migration and create vector similarity index.

### API Endpoints (Hono)

- **FR-13**: System MUST provide REST API endpoints:
  - `POST /api/documents` - Create document
  - `GET /api/documents` - List user's documents
  - `GET /api/documents/:id` - Get document by ID
  - `PUT /api/documents/:id` - Update document
  - `DELETE /api/documents/:id` - Delete document (hard delete)
  - `POST /api/sources` - Create source
  - `GET /api/sources/:documentId` - List sources for document
  - `PUT /api/sources/:id` - Update source metadata
  - `DELETE /api/sources/:id` - Delete source
  - `GET /api/credits` - Get user credit balance
  - `POST /api/credits/deduct` - Deduct credits (internal use)
- **FR-14**: System MUST validate all request bodies with Zod schemas from `@10xstudent/domain`.
- **FR-15**: System MUST return structured error responses with appropriate HTTP status codes.

### AI Chat Endpoint (TanStack AI)

- **FR-16**: System MUST provide `POST /api/chat` endpoint that handles ALL AI interactions.
- **FR-17**: System MUST implement server tools within `/api/chat` using TanStack AI pattern:
  - `webSearch` - Tavily web search
  - `addSource` - Create source record and queue embedding generation
  - `querySourcesRAG` - Semantic search sources using pgvector
  - `saveDocument` - Persist document to database
  - `checkCredits` - Verify user has sufficient credits
  - `getNextCitationNumber` - Atomically increment and return citation counter
- **FR-18**: System MUST authenticate `/api/chat` endpoint (require valid Clerk JWT).
- **FR-19**: System MUST log all tool invocations with Pino.
- **FR-20**: System MUST stream responses using Server-Sent Events (SSE).

### Credit System

- **FR-21**: System MUST initialize new users with 10,000 credits via Clerk webhook.
- **FR-22**: System MUST reset all users' credits to 10,000 on the 1st of each month via BullMQ background job.
- **FR-23**: System MUST update `creditsResetAt` timestamp when credits are reset.
- **FR-24**: System MUST deduct credits based on token usage:
  - Typst generation: `Math.ceil(tokens / 1000)` credits
  - Web search: 1 credit per search
  - RAG query: 0 credits (free)
  - Save document: 0 credits (free)
- **FR-25**: System MUST track token usage via middleware that intercepts LLM responses.
- **FR-26**: System MUST log all credit operations to `credit_logs` table for audit.
- **FR-27**: System MUST prevent operations when user credits < operation cost.

### Webhooks

- **FR-28**: System MUST provide `POST /api/webhooks/clerk` endpoint for Clerk webhooks.
- **FR-29**: System MUST handle `user.created` event to create user record with 10,000 initial credits.
- **FR-30**: System MUST verify webhook signatures before processing events.

### Cron Jobs

- **FR-31**: System MUST provide BullMQ job that runs on the 1st of each month at 00:00 UTC using cron expression.
- **FR-32**: Cron job MUST reset all users' credits to 10,000 and update `creditsResetAt`.

### Auto-Save

- **FR-33**: System MUST accept auto-save requests (debounced 5s on client).
- **FR-34**: System MUST update `updatedAt` timestamp on every save.
- **FR-35**: System MUST use database transactions for atomic saves.

### Logging (Pino)

- **FR-36**: System MUST use Pino for structured logging.
- **FR-37**: System MUST log:
  - HTTP requests (method, path, status, duration, userId)
  - Credit operations (userId, operation, cost, tokensUsed)
  - Tool invocations (toolName, userId, duration, success)
  - Webhook events (eventType, userId, success)
  - Cron job executions (jobName, usersAffected, duration, success)
  - Errors (message, stack, context)

---

## 4. Technical Architecture

### Database Schema (Drizzle)

```typescript
// packages/database/schema/users.ts
import { pgTable, uuid, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // Clerk userId
  credits: integer("credits").notNull().default(10000),
  preferences: jsonb("preferences").$type<{
    defaultCitationFormat: "APA" | "MLA" | "Chicago";
    defaultResearchDepth: "quick" | "deep";
  }>(),
  creditsResetAt: timestamp("credits_reset_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// packages/database/schema/documents.ts
import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  typstContent: text("typst_content").notNull(),
  template: text("template").notNull(), // Static identifier: 'research-paper' | 'report' | 'essay' | 'article' | 'notes'
  // Templates are code in packages/templates/, NOT stored in database
  citationFormat: text("citation_format").notNull().default("APA"), // 'APA' | 'MLA' | 'Chicago'
  citationCount: integer("citation_count").notNull().default(0), // Auto-incremented counter for citations
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// packages/database/schema/sources.ts
import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { vector } from "pgvector/drizzle-orm";

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  title: text("title"),
  author: text("author"),
  publicationDate: timestamp("publication_date"),
  accessDate: timestamp("access_date").notNull().defaultNow(),
  content: text("content"), // Extracted text for RAG
  embedding: vector("embedding", { dimensions: 768 }), // Google text-embedding-004
  metadata: jsonb("metadata").$type<{
    sourceType: "web" | "manual";
    isAvailable: boolean;
    extractedAt?: string;
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// packages/database/schema/credit-logs.ts
import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

export const creditLogs = pgTable("credit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  operation: text("operation").notNull(), // 'typst_generation' | 'web_search' | 'rag_query'
  cost: integer("cost").notNull(),
  tokensUsed: integer("tokens_used"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});
```

### Indexes & pgvector Setup

```typescript
// packages/database/schema/indexes.ts
import { index } from "drizzle-orm/pg-core";

export const documentsUserIdIdx = index("documents_user_id_idx").on(
  documents.userId,
);
export const documentsCreatedAtIdx = index("documents_created_at_idx").on(
  documents.createdAt,
);
export const sourcesDocumentIdIdx = index("sources_document_id_idx").on(
  sources.documentId,
);
export const creditLogsUserIdIdx = index("credit_logs_user_id_idx").on(
  creditLogs.userId,
);
export const creditLogsTimestampIdx = index("credit_logs_timestamp_idx").on(
  creditLogs.timestamp,
);
```

### pgvector Migration

```sql
-- migrations/0001_enable_pgvector.sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector similarity index for sources
-- Using ivfflat index for fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS sources_embedding_idx
ON sources
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Note: For production with >1M vectors, consider using HNSW index instead:
-- CREATE INDEX sources_embedding_idx ON sources USING hnsw (embedding vector_cosine_ops);
```

### Zod Schemas

```typescript
// packages/domain/src/document.ts
import { z } from "zod";

export const templateSchema = z.enum([
  "research-paper",
  "report",
  "essay",
  "article",
  "notes",
]);
export const citationFormatSchema = z.enum(["APA", "MLA", "Chicago"]);

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  typstContent: z.string().max(100000), // ~1000 lines
  template: templateSchema,
  citationFormat: citationFormatSchema.default("APA"),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  typstContent: z.string().max(100000).optional(),
  citationFormat: citationFormatSchema.optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

// packages/domain/src/source.ts
export const createSourceSchema = z.object({
  documentId: z.string().uuid(),
  url: z.string().url(),
  title: z.string().optional(),
  author: z.string().optional(),
  publicationDate: z.string().datetime().optional(),
  content: z.string().optional(),
});

export const updateSourceSchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
  publicationDate: z.string().datetime().optional(),
});

export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;

// packages/domain/src/tools.ts
import { createTool } from "@tanstack/ai";
import { z } from "zod";

// Web Search Tool Definition
export const webSearchDef = createTool({
  id: "webSearch",
  description: "Search the web for information using Tavily API",
  parameters: z.object({
    query: z.string().describe("The search query"),
    maxResults: z
      .number()
      .optional()
      .describe("Maximum number of results (default: 5)"),
  }),
  execute: async () => {
    throw new Error("Must be implemented on server");
  },
});

// Add Source Tool Definition
export const addSourceDef = createTool({
  id: "addSource",
  description: "Add a source to the document and queue embedding generation",
  parameters: z.object({
    documentId: z.string().uuid().describe("The document ID"),
    url: z.string().url().describe("The source URL"),
    title: z.string().optional().describe("The source title"),
    author: z.string().optional().describe("The source author"),
    publicationDate: z
      .string()
      .optional()
      .describe("Publication date (ISO 8601)"),
  }),
  execute: async () => {
    throw new Error("Must be implemented on server");
  },
});

// Query Sources RAG Tool Definition
export const querySourcesRAGDef = createTool({
  id: "querySourcesRAG",
  description: "Perform semantic search on document sources using RAG",
  parameters: z.object({
    documentId: z.string().uuid().describe("The document ID"),
    query: z.string().describe("The search query"),
  }),
  execute: async () => {
    throw new Error("Must be implemented on server");
  },
});

// Save Document Tool Definition
export const saveDocumentDef = createTool({
  id: "saveDocument",
  description: "Save document content to database",
  parameters: z.object({
    documentId: z.string().uuid().describe("The document ID"),
    typstContent: z.string().describe("The Typst content to save"),
  }),
  execute: async () => {
    throw new Error("Must be implemented on server");
  },
});

// Check Credits Tool Definition
export const checkCreditsDef = createTool({
  id: "checkCredits",
  description: "Check user's current credit balance",
  parameters: z.object({}),
  execute: async () => {
    throw new Error("Must be implemented on server");
  },
});

// Get Next Citation Number Tool Definition
export const getNextCitationNumberDef = createTool({
  id: "getNextCitationNumber",
  description:
    "Get the next citation number for a document (atomically increments counter)",
  parameters: z.object({
    documentId: z.string().uuid().describe("The document ID"),
  }),
  execute: async () => {
    throw new Error("Must be implemented on server");
  },
});
```

### API Routes (Hono)

```typescript
// apps/api/routes/documents.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, schema, eq, desc } from "@10xstudent/database";
import { createDocumentSchema, updateDocumentSchema } from "@10xstudent/domain";
import { authMiddleware } from "../middleware/auth";

const app = new Hono();

app.use("*", authMiddleware);

app.post("/", zValidator("json", createDocumentSchema), async (c) => {
  const userId = c.get("auth").userId;
  const data = c.req.valid("json");

  // Validate line count
  const lineCount = data.typstContent.split("\n").length;
  if (lineCount > 1000) {
    return c.json({ error: "Document exceeds 1000 line limit" }, 400);
  }

  const [document] = await db
    .insert(schema.documents)
    .values({
      userId,
      ...data,
    })
    .returning();

  return c.json(document, 201);
});

app.get("/", async (c) => {
  const userId = c.get("auth").userId;

  const documents = await db.query.documents.findMany({
    where: eq(schema.documents.userId, userId),
    orderBy: [desc(schema.documents.updatedAt)],
  });

  return c.json(documents);
});

app.get("/:id", async (c) => {
  const userId = c.get("auth").userId;
  const id = c.req.param("id");

  const document = await db.query.documents.findFirst({
    where: eq(schema.documents.id, id),
  });

  if (!document) {
    return c.json({ error: "Document not found" }, 404);
  }

  if (document.userId !== userId) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  return c.json(document);
});

app.put("/:id", zValidator("json", updateDocumentSchema), async (c) => {
  const userId = c.get("auth").userId;
  const id = c.req.param("id");
  const data = c.req.valid("json");

  // Validate line count if content updated
  if (data.typstContent) {
    const lineCount = data.typstContent.split("\n").length;
    if (lineCount > 1000) {
      return c.json({ error: "Document exceeds 1000 line limit" }, 400);
    }
  }

  const [document] = await db
    .update(schema.documents)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.documents.id, id))
    .returning();

  if (!document) {
    return c.json({ error: "Document not found" }, 404);
  }

  if (document.userId !== userId) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  return c.json(document);
});

app.delete("/:id", async (c) => {
  const userId = c.get("auth").userId;
  const id = c.req.param("id");

  const document = await db.query.documents.findFirst({
    where: eq(schema.documents.id, id),
  });

  if (!document) {
    return c.json({ error: "Document not found" }, 404);
  }

  if (document.userId !== userId) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  await db.delete(schema.documents).where(eq(schema.documents.id, id));

  return c.json({ success: true });
});

export default app;
```

### Middleware

```typescript
// apps/api/middleware/auth.ts
import { createMiddleware } from "hono/factory";
import { clerkClient } from "@clerk/clerk-sdk-node";

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const session = await clerkClient.verifyToken(token);
    c.set("auth", { userId: session.sub, sessionId: session.sid });
    await next();
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }
});

// apps/api/middleware/logger.ts
import { createMiddleware } from "hono/factory";
import { logger } from "@10xstudent/logger";

export const loggerMiddleware = createMiddleware(async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;

  logger.info(
    {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration,
      userId: c.get("auth")?.userId,
    },
    "HTTP Request",
  );
});

// apps/api/middleware/credits.ts
import { createMiddleware } from "hono/factory";
import { db, schema, eq } from "@10xstudent/database";

export const checkCreditsMiddleware = (minCredits: number) => {
  return createMiddleware(async (c, next) => {
    const userId = c.get("auth").userId;

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user || user.credits < minCredits) {
      return c.json({ error: "Insufficient credits" }, 402);
    }

    await next();
  });
};
```

### Clerk Webhook Handler

```typescript
// apps/web/app/api/webhooks/clerk/route.ts
import { Webhook } from "svix";
import { headers } from "next/headers";
import { db, schema } from "@10xstudent/database";
import { logger } from "@10xstudent/logger";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("CLERK_WEBHOOK_SECRET is not set");
  }

  // Get headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify webhook signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    logger.error({ err }, "Webhook signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  // Handle user.created event
  if (evt.type === "user.created") {
    const { id } = evt.data;

    try {
      await db.insert(schema.users).values({
        id,
        credits: 10000,
        creditsResetAt: new Date(),
      });

      logger.info(
        {
          userId: id,
          credits: 10000,
          type: "user_created",
        },
        "User created with initial credits",
      );

      return new Response("User created", { status: 200 });
    } catch (err) {
      logger.error({ err, userId: id }, "Failed to create user");
      return new Response("Failed to create user", { status: 500 });
    }
  }

  return new Response("Event not handled", { status: 200 });
}
```

### Credit Reset Cron Job

```typescript
// apps/api/lib/queues.ts
import { Queue, Worker } from "bullmq";
import { db, schema } from "@10xstudent/database";
import { logger } from "@10xstudent/logger";
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
});

// Create queue for credit reset job
export const creditResetQueue = new Queue("credit-reset", {
  connection: redis,
});

// Define the job processor
export function startCreditResetWorker() {
  const worker = new Worker(
    "credit-reset",
    async (job) => {
      const startTime = Date.now();

      try {
        // Reset all users' credits to 10,000
        const result = await db
          .update(schema.users)
          .set({
            credits: 10000,
            creditsResetAt: new Date(),
          })
          .returning({ id: schema.users.id });

        const duration = Date.now() - startTime;
        const usersAffected = result.length;

        logger.info(
          {
            jobName: "reset_credits",
            jobId: job.id,
            usersAffected,
            duration,
            success: true,
            type: "background_job",
          },
          "Credits reset completed",
        );

        return {
          success: true,
          usersAffected,
          duration,
        };
      } catch (err) {
        logger.error(
          { err, jobName: "reset_credits", jobId: job.id },
          "Credit reset failed",
        );
        throw err; // BullMQ will retry automatically
      }
    },
    { connection: redis },
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Credit reset job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, err, attempts: job?.attemptsMade },
      "Credit reset job failed",
    );
  });

  return worker;
}

// Schedule recurring job (runs on 1st of each month at 00:00 UTC)
export async function scheduleMonthlyCreditsReset() {
  await creditResetQueue.add(
    "monthly-reset",
    {},
    {
      repeat: {
        pattern: "0 0 1 * *", // Cron: 1st of month at 00:00 UTC
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );

  logger.info("Monthly credit reset job scheduled");
}
```

```typescript
// apps/api/index.ts
import { Hono } from "hono";
import {
  startCreditResetWorker,
  scheduleMonthlyCreditsReset,
} from "./lib/queues";

const app = new Hono();

// Mount routes
app.route("/api/documents", documentsRouter);
app.route("/api/sources", sourcesRouter);
app.route("/api/chat", chatRouter);

// Start background job workers
startCreditResetWorker();
scheduleMonthlyCreditsReset();

logger.info("[Server] BullMQ workers started");

export default app;
```

### AI Chat Endpoint with TanStack AI Server Tools

```typescript
// apps/web/app/api/chat/route.ts
import { chat } from "@tanstack/ai";
import { geminiText } from "@tanstack/ai-google";
import { toServerSentEventsResponse } from "@tanstack/ai/server";
import { db, schema, eq, sql } from "@10xstudent/database";
import { logger } from "@10xstudent/logger";
import { auth } from "@clerk/nextjs/server";
import {
  webSearchDef,
  addSourceDef,
  querySourcesRAGDef,
  saveDocumentDef,
  checkCreditsDef,
  getNextCitationNumberDef,
} from "@10xstudent/domain/tools";

export async function POST(request: Request) {
  // Authenticate user
  const { userId } = auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await request.json();

  // Web Search Tool
  const webSearch = webSearchDef.server(async ({ query, maxResults }) => {
    logger.info({ userId, query, toolName: "webSearch" }, "Tool invoked");

    // Check credits
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user || user.credits < 1) {
      throw new Error("Insufficient credits");
    }

    // Deduct credits
    await db
      .update(schema.users)
      .set({ credits: sql`credits - 1` })
      .where(eq(schema.users.id, userId));

    await db.insert(schema.creditLogs).values({
      userId,
      operation: "web_search",
      cost: 1,
      tokensUsed: null,
    });

    // Call Tavily API
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: maxResults || 5,
      }),
    });

    const data = await response.json();
    return data.results;
  });

  // Add Source Tool
  const addSource = addSourceDef.server(
    async ({ documentId, url, title, author, publicationDate }) => {
      logger.info(
        { userId, documentId, toolName: "addSource" },
        "Tool invoked",
      );

      // Create source record
      const [source] = await db
        .insert(schema.sources)
        .values({
          documentId,
          url,
          title,
          author,
          publicationDate: publicationDate ? new Date(publicationDate) : null,
          metadata: {
            sourceType: "web",
            isAvailable: true,
          },
        })
        .returning();

      // TODO: Queue embedding generation job (Spec 4)
      // This will be handled by a background job that:
      // 1. Fetches content from URL
      // 2. Generates embedding using Google text-embedding-004
      // 3. Updates source record with content and embedding

      return { sourceId: source.id, success: true };
    },
  );

  // Query Sources RAG Tool
  const querySourcesRAG = querySourcesRAGDef.server(
    async ({ documentId, query }) => {
      logger.info(
        { userId, documentId, toolName: "querySourcesRAG" },
        "Tool invoked",
      );

      // Generate query embedding
      const embeddingResponse = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GOOGLE_API_KEY!,
          },
          body: JSON.stringify({
            content: { parts: [{ text: query }] },
          }),
        },
      );

      const embeddingData = await embeddingResponse.json();
      const queryEmbedding = embeddingData.embedding.values;

      // Perform vector similarity search
      const results = await db.execute(sql`
        SELECT 
          id, 
          url, 
          title, 
          author, 
          content,
          1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
        FROM ${schema.sources}
        WHERE document_id = ${documentId}
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT 5
      `);

      return results.rows;
    },
  );

  // Save Document Tool
  const saveDocument = saveDocumentDef.server(
    async ({ documentId, typstContent }) => {
      logger.info(
        { userId, documentId, toolName: "saveDocument" },
        "Tool invoked",
      );

      // Validate line count
      const lineCount = typstContent.split("\n").length;
      if (lineCount > 1000) {
        throw new Error("Document exceeds 1000 line limit");
      }

      await db
        .update(schema.documents)
        .set({
          typstContent,
          updatedAt: new Date(),
        })
        .where(eq(schema.documents.id, documentId));

      return { success: true };
    },
  );

  // Check Credits Tool
  const checkCredits = checkCreditsDef.server(async () => {
    logger.info({ userId, toolName: "checkCredits" }, "Tool invoked");

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    return {
      credits: user?.credits || 0,
      hasCredits: (user?.credits || 0) > 0,
    };
  });

  // Get Next Citation Number Tool
  const getNextCitationNumber = getNextCitationNumberDef.server(
    async ({ documentId }) => {
      logger.info(
        { userId, documentId, toolName: "getNextCitationNumber" },
        "Tool invoked",
      );

      // Atomically increment citation counter
      const [document] = await db
        .update(schema.documents)
        .set({
          citationCount: sql`citation_count + 1`,
        })
        .where(eq(schema.documents.id, documentId))
        .returning({ citationCount: schema.documents.citationCount });

      return { citationNumber: document.citationCount };
    },
  );

  // Create chat stream with all tools
  const stream = chat({
    adapter: geminiText("gemini-2.0-flash-thinking-exp"),
    messages,
    tools: [
      webSearch,
      addSource,
      querySourcesRAG,
      saveDocument,
      checkCredits,
      getNextCitationNumber,
    ],
  });

  return toServerSentEventsResponse(stream);
}
```

### Credit System

```typescript
// packages/domain/src/credits.ts
export const CREDIT_COSTS = {
  TYPST_GENERATION: (tokens: number) => Math.ceil(tokens / 1000),
  WEB_SEARCH: 1,
  RAG_QUERY: 0,
  SAVE_DOCUMENT: 0,
} as const;

export type CreditOperation = keyof typeof CREDIT_COSTS;

// apps/api/lib/credits.ts
import { db, schema, eq, sql } from "@10xstudent/database";
import { logger } from "@10xstudent/logger";
import { CREDIT_COSTS, CreditOperation } from "@10xstudent/domain";

export async function deductCredits(
  userId: string,
  operation: CreditOperation,
  params: { tokens?: number },
) {
  const costFn = CREDIT_COSTS[operation];
  const cost =
    typeof costFn === "function" ? costFn(params.tokens || 0) : costFn;

  await db.transaction(async (tx) => {
    // Deduct credits
    await tx
      .update(schema.users)
      .set({ credits: sql`credits - ${cost}` })
      .where(eq(schema.users.id, userId));

    // Log operation
    await tx.insert(schema.creditLogs).values({
      userId,
      operation,
      cost,
      tokensUsed: params.tokens,
    });
  });

  logger.info(
    {
      userId,
      operation,
      cost,
      tokensUsed: params.tokens,
      type: "credit_deduction",
    },
    "Credits deducted",
  );
}

export async function getUserCredits(userId: string): Promise<number> {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });

  return user?.credits || 0;
}
```

---

## 5. Success Criteria (Measurable)

- **SC-01**: All API endpoints return responses within 200ms (excluding external API calls).
- **SC-02**: Database queries use indexes (verified via EXPLAIN ANALYZE).
- **SC-03**: Auto-save operations complete within 500ms.
- **SC-04**: Credit deductions are atomic (no partial failures).
- **SC-05**: All API requests are logged with Pino.
- **SC-06**: 100% of endpoints require authentication.
- **SC-07**: Zod validation catches invalid inputs before database operations.
- **SC-08**: Webhook signature verification prevents unauthorized user creation.
- **SC-09**: Cron job successfully resets credits for all users on the 1st of each month.
- **SC-10**: `/api/chat` endpoint streams responses using SSE.
- **SC-11**: Server tools execute within `/api/chat` (no separate tool endpoints).
- **SC-12**: Citation counter increments atomically without race conditions.
- **SC-13**: Vector similarity search returns results within 100ms for <10k sources.

---

## 6. Edge Cases & Error Handling

### Authentication

- **EC-01**: If Clerk token is expired, return 401 with clear error message.
- **EC-02**: If Clerk service is down, return 503 with retry-after header.

### Database

- **EC-03**: If database connection fails, return 503 and log error.
- **EC-04**: If document not found, return 404 (not 500).
- **EC-05**: If user tries to access another user's document, return 403.

### Credits

- **EC-06**: If user has insufficient credits, return 402 with credit balance.
- **EC-07**: If credit deduction fails mid-transaction, rollback entire operation.
- **EC-08**: If credits go negative due to race condition, log alert and reset to 0.

### Validation

- **EC-09**: If document exceeds 1000 lines, return 400 with line count.
- **EC-10**: If invalid UUID provided, return 400 (not 500).

### Webhooks

- **EC-11**: If webhook signature verification fails, return 400 and log attempt.
- **EC-12**: If user already exists in database, handle gracefully (idempotent operation).
- **EC-13**: If webhook processing fails, return 500 but log details for manual recovery.

### Cron Jobs

- **EC-14**: If background job fails mid-execution, BullMQ automatically retries with exponential backoff (max 3 attempts).
- **EC-15**: If Redis connection fails, log error and alert (job will retry when Redis is available).
- **EC-16**: If database is unavailable during job execution, BullMQ retries automatically.

### AI Chat Endpoint

- **EC-17**: If tool execution fails, return error to LLM so it can retry or inform user.
- **EC-18**: If user runs out of credits mid-conversation, block further tool calls gracefully.
- **EC-19**: If embedding generation fails, log error but don't block source creation.

---

## 7. Implementation Checklist

### Setup

- [ ] Install dependencies: `drizzle-orm`, `@clerk/nextjs`, `svix`, `hono`, `zod`, `pino`, `pgvector`, `@tanstack/ai`, `@tanstack/ai-google`
- [ ] Configure PostgreSQL with pgvector extension
- [ ] Set up Drizzle config and migrations
- [ ] Configure Clerk API keys in `.env`
- [ ] Configure Clerk webhook endpoint in Clerk Dashboard
- [ ] Set up Vercel Cron job for credit resets
- [ ] Configure environment variables:
  - `CLERK_WEBHOOK_SECRET`
  - `CRON_SECRET`
  - `TAVILY_API_KEY`
  - `GOOGLE_API_KEY`

### Database

- [ ] Create `users` table schema with `creditsResetAt` field
- [ ] Create `documents` table schema with `citationCount` field
- [ ] Create `sources` table schema with pgvector
- [ ] Create `credit_logs` table schema
- [ ] Add indexes for performance
- [ ] Create migration to enable pgvector extension
- [ ] Create vector similarity index on sources.embedding
- [ ] Run migrations

### API

- [ ] Implement auth middleware (Clerk JWT verification)
- [ ] Implement logger middleware (Pino)
- [ ] Implement credit check middleware
- [ ] Create document CRUD endpoints (Hono)
- [ ] Create source CRUD endpoints (Hono)
- [ ] Create credit endpoints (Hono)
- [ ] Create `/api/chat` endpoint with TanStack AI server tools
- [ ] Implement `webSearch` server tool
- [ ] Implement `addSource` server tool
- [ ] Implement `querySourcesRAG` server tool
- [ ] Implement `saveDocument` server tool
- [ ] Implement `checkCredits` server tool
- [ ] Implement `getNextCitationNumber` server tool

### Webhooks & Cron

- [ ] Create `/api/webhooks/clerk` endpoint
- [ ] Implement webhook signature verification
- [ ] Handle `user.created` event
- [ ] Create `/api/cron/reset-credits` endpoint
- [ ] Configure Vercel Cron schedule in `vercel.json`
- [ ] Test webhook locally with Clerk CLI
- [ ] Test cron job locally

### Domain

- [ ] Define Zod schemas in `@10xstudent/domain`
- [ ] Define TypeScript types
- [ ] Define credit cost constants
- [ ] Define TanStack AI tool definitions (webSearchDef, addSourceDef, etc.)

### Testing

- [ ] Unit tests for credit deduction logic
- [ ] E2E tests for document CRUD
- [ ] E2E tests for authentication
- [ ] E2E tests for credit system
- [ ] E2E tests for webhook handler
- [ ] E2E tests for background job
- [ ] Load test credit reset with 10k+ users
- [ ] Document BullMQ configuration and monitoring
- [ ] Document TanStack AI tool execution pattern
- [ ] Create database schema diagram

---

## 8. Out of Scope

- Client-side version history (handled in Spec 5)
- Typst compilation (handled in Spec 3)
- AI chat UI interface (handled in Spec 2)
- Embedding generation background jobs using BullMQ (handled in Spec 4)
- Source content extraction (handled in Spec 4)
- UI components (handled in Spec 5)
- Payment processing for additional credits (future feature)
- User preferences management UI (future feature)

---

## 9. Environment Variables

### Required Configuration

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/10xstudent

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# API Keys
GOOGLE_API_KEY=AIza...  # For Gemini and text-embedding-004
TAVILY_API_KEY=tvly-...  # For web search

# Cron Job Security
CRON_SECRET=your-random-secret-here  # Generate with: openssl rand -base64 32

# Logging
LOG_LEVEL=info  # debug | info | warn | error
```

### Security Notes

- **Never commit secrets to git** - use `.env.local` for local development
- **Use Vercel Environment Variables** for production deployment
- **Rotate secrets regularly** - especially webhook and Redis secrets
- **Use different API keys** for development and production environments

---

## 10. Database Migration Strategy

### Running Migrations

```bash
# Generate migration from schema changes
pnpm --filter @10xstudent/database drizzle-kit generate

# Apply migrations to database
pnpm --filter @10xstudent/database drizzle-kit migrate

# Push schema directly (development only)
pnpm --filter @10xstudent/database drizzle-kit push
```

### Migration Best Practices

- **Always generate migrations** for schema changes (never edit SQL directly)
- **Test migrations locally** before deploying to production
- **Use transactions** for complex migrations
- **Add indexes separately** from table creation for large tables
- **Backup database** before running migrations in production

### Handling Schema Changes

1. **Adding a column**: Use `.default()` or `.notNull(false)` to avoid breaking existing rows
2. **Removing a column**: First deploy code that doesn't use the column, then remove it
3. **Renaming a column**: Use two-step migration (add new, copy data, remove old)
4. **Changing column type**: May require data transformation migration

---

## 11. Next Steps

After completing this spec:

1. Proceed to **Spec 2: TanStack AI & LLM Integration**
2. The `/api/chat` endpoint defined here is the foundation for all AI interactions
3. Server tools execute within `/api/chat` using the TanStack AI pattern (see Spec 0)
4. Credit system will track all AI operations
5. Webhook and background job ensure proper user lifecycle management

### Key Architecture Points (from Spec 0)

- **Server tools are NOT separate endpoints** - they execute within `/api/chat`
- **TanStack AI handles tool orchestration** - the LLM decides when to call tools
- **All AI interactions flow through one endpoint** - `/api/chat` is the single entry point
- **Templates are static code** - stored in `packages/templates/`, not in database

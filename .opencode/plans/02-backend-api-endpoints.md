# Phase 2: Backend API Endpoints

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement core backend API endpoints for Typst compilation, document CRUD, and AI chat with SSE streaming.

**Architecture:** Hono REST API with Clerk JWT authentication, Drizzle ORM for database access, server-side Typst compilation via Docker exec, TanStack AI for chat orchestration.

**Tech Stack:** Hono, Drizzle ORM, Clerk, Zod, TanStack AI, PostgreSQL, Docker

---

## Prerequisites

- Phase 1 completed (Docker infrastructure running)
- Database schema already exists in `packages/database/src/schema/`
- AI tool definitions exist in `packages/ai-tools/`
- Auth middleware exists in `apps/api/src/middleware/auth.ts`

---

## Task 1: Implement Typst Compilation Endpoint

**Files:**

- Create: `apps/api/src/routes/compile.ts`
- Create: `apps/api/src/services/typst-compiler.ts`
- Modify: `apps/api/src/routes/app.ts`

**Context:** The `/api/compile` endpoint receives Typst source code, executes compilation in Docker container, returns PDF blob. Implements 2-second debounced auto-compile from frontend.

**Step 1: Create Typst compiler service**

Create `apps/api/src/services/typst-compiler.ts`:

```typescript
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile } from "fs/promises";
import { join } from "path";
import crypto from "crypto";

const execAsync = promisify(exec);

export interface CompileOptions {
  source: string;
  timeout?: number; // milliseconds
}

export interface CompileResult {
  success: boolean;
  pdf?: Buffer;
  error?: string;
  compilationTime: number;
}

/**
 * Compiles Typst source to PDF using Docker container
 */
export class TypstCompiler {
  private workspaceDir = "/workspace";
  private containerName = "10xstudent-typst";

  /**
   * Generate content hash for caching
   */
  private hashContent(source: string): string {
    return crypto.createHash("sha256").update(source).digest("hex");
  }

  /**
   * Compile Typst source to PDF
   */
  async compile(options: CompileOptions): Promise<CompileResult> {
    const startTime = Date.now();
    const contentHash = this.hashContent(options.source);
    const inputFile = `${contentHash}.typ`;
    const outputFile = `${contentHash}.pdf`;
    const timeout = options.timeout || 30000;

    try {
      // Write source to temp file in workspace
      const inputPath = join(process.cwd(), "tmp/typst-workspace", inputFile);
      const outputPath = join(process.cwd(), "tmp/typst-workspace", outputFile);

      await writeFile(inputPath, options.source, "utf-8");

      // Execute typst compile in Docker container
      const command = `docker exec ${this.containerName} typst compile ${this.workspaceDir}/${inputFile} ${this.workspaceDir}/${outputFile}`;

      await execAsync(command, { timeout });

      // Read compiled PDF
      const pdf = await readFile(outputPath);

      // Cleanup temp files
      await Promise.all([
        unlink(inputPath).catch(() => {}),
        unlink(outputPath).catch(() => {}),
      ]);

      const compilationTime = Date.now() - startTime;

      return {
        success: true,
        pdf,
        compilationTime,
      };
    } catch (error) {
      const compilationTime = Date.now() - startTime;
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown compilation error",
        compilationTime,
      };
    }
  }
}
```

**Step 2: Create compile route**

Create `apps/api/src/routes/compile.ts`:

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { TypstCompiler } from "../services/typst-compiler";

const compileSchema = z.object({
  source: z.string().min(1).max(100000), // Max ~1000 lines
});

export const compileRouter = new Hono();

const compiler = new TypstCompiler();

/**
 * POST /compile
 * Compiles Typst source to PDF
 */
compileRouter.post("/", zValidator("json", compileSchema), async (c) => {
  const { source } = c.req.valid("json");

  const result = await compiler.compile({ source });

  if (!result.success) {
    return c.json({ error: "Compilation failed", details: result.error }, 400);
  }

  // Return PDF with compilation time header
  c.header("X-Compilation-Time", result.compilationTime.toString());
  c.header("Content-Type", "application/pdf");
  c.header("Content-Disposition", 'inline; filename="document.pdf"');

  return c.body(result.pdf!);
});
```

**Step 3: Register compile route**

Modify `apps/api/src/routes/app.ts`:

```typescript
import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { compileRouter } from "./compile";

export const appRouter = new Hono();

appRouter.get("/", (c) => c.json({ message: "Welcome to 10xStudent API" }));

// Prote
appRouter.use("/*", authMiddleware);

// Register routes
appRouter.route("/compile", compileRouter);

// TODO: Add remaining routes:
// appRouter.route('/documents', documentsRouter);
// appRouter.route('/sources', sourcesRouter);
// appRouter.route('/credits', creditsRouter);
// appRouter.route('/chat', chatRouter);
```

**Step 4: Test compilation endpoint**

Run: `bun run dev` (in apps/api)
Expected: Server starts on port 3000

Test with curl:

```bash
curl -X POST http://localhost:3000/compile \
  -H "Content-Type: application/json" \
  -H "Authorization: Betest-token" \
  -d '{"source": "= Hello World\n\nThis is a test."}' \
  --output test.pdf
```

Expected: PDF file created

**Step 5: Commit**

```bash
git add apps/api/src/services/typst-compiler.ts apps/api/src/routes/compile.ts apps/api/src/routes/app.ts
git commit -m "feat(api): implement Typst compilation endpoint"
```

---

## Task 2: Implement Document CRUD Endpoints

**Files:**

- Create: `apps/api/src/routes/documents.ts`
- Modify: `apps/api/src/routes/app.ts`

**Context:** Document CRUD operations with user authorization. Users can only access their own documents.

**Step 1: Create documents route**

Create `apps/api/src/routes/documents.ts`:

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@10xstudent/database';
import { documents } from '@10xstudent/database/schema';
import { eq, and, desc } from 'drizzle-orm';

const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  typstContent: z.string().max(100000),
  template: z.enum(['research-paper', 'report', 'essay', 'article', 'notes']),
  citationFormat: z.enum(['APA', 'MLA', 'Chicago']).defau'APA'),
});

const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  typstContent: z.string().max(100000).optional(),
  citationFormat: z.enum(['APA', 'MLA', 'Chicago']).optional(),
});

export const documentsRouter = new Hono();

/**
 * GET /documents
 * List all documents for authenticated user
 */
documentsRouter.get('/', async (c) => {
  const auth = c.get('auth');

  const userDocuments = await db
    .select()
    .from(documents)
    .where(eq(documents.userId, auth.userId))
    .orderBy(desc(documents.updatedAt));

  return c.json({ documents: userDocuments });
});

/**
 * GET /documents/:id
 * Get single document by ID
 */
documentsRouter.get('/:id', async (c) => {
  const auth = c.get('auth');
  const documentId = c.req.param('id');

  const [document] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.userId, auth.userId)
      )
    );

  if (!document) {
    return c.json({ error: 'Document not found' }, 404);
  }

  return c.json({ document });
});

/**
 * POST /documents
 * Create new document
 */
documentsRouter.post('/', zValidator('json', createDocumentSchema), async (c) => {
  const auth = c.get('auth');
  const data = c.req.valid('json');

  const [document] = await db
    .insert(documents)
    .values({
      ...data,
      userId: auth.userId,
    })
    .returning();

  return c.json({ document }, 201);
});

/**
 * PUT /documents/:id
 * Update document (auto-save endpoint)
 */
documentsRouter.put('/:id', zValidator('json', updateDocumentSchema), async (c) => {
  const auth = c.get('auth');
  const documentId = c.req.param('id');
  const data = c.req.valid('json');

  const [document] = await db
    .update(documents)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documents.id, docum,
        eq(documents.userId, auth.userId)
      )
    )
    .returning();

  if (!document) {
    return c.json({ error: 'Document not found' }, 404);
  }

  return c.json({ document });
});

/**
 * DELETE /documents/:id
 * Delete document
 */
documentsRouter.delete('/:id', async (c) => {
  const auth = c.get('auth');
  const documentId = c.req.param('id');

  const [document] = await db
    .delete(documents)
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.userId, auth.userId)
      )
    )
    .returning();

  if (!document) {
    return c.json({ error: 'Document not found' }, 404);
  }

  return c.json({ success: true });
});
```

**Step 2: Register documents route**

Modify `apps/api/src/routes/app.ts`:

```typescript
import { documentsRouter } from "./documents";

// ... existing code ...

appRouter.route("/compile", compileRouter);
appRouter.route("/documents", documentsRouter);
```

**Step 3: Test document endpoints**

Test create:

```bash
curl -X POST http://localhost:3000/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"title":"Test Doc","typstContent":"= Hello","template":"essay"}'
```

Expected: Returns created document with ID

**Step 4: Commit**

```bash
git add apps/api/src/routes/documents.ts apps/api/src/routes/app.ts
git commit -m "feat(api): implement document CRUD endpoints"
```

---

## Task 3: Implement Credits Endpoints

**Files:**

- Create: `apps/api/src/routes/credits.ts`
- Modify: `apps/api/src/routes/app.ts`

**Context:** Credit balance checking and transaction history for AI operations.

**Step 1: Create credits route**

Create `apps/api/src/routes/credits.ts`:

```typescript
import { Hono } from "hono";
import { db } from "@10xstudent/database";
import { users, creditLogs } from "@10xstudent/database/schema";
import { eq, desc } from "drizzle-orm";

export const creditsRouter = new Hono();

/**
 * GET /credits/balance
 * Get current credit balance
 */
creditsRouter.get("/balance", async (c) => {
  const auth = c.get("auth");

  const [user] = await db
    .select({ credits: users.credits })
    .from(users)
    .where(eq(users.id, auth.userId));

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({ credits: user.credits });
});

/*T /credits/history
 * Get credit transaction history
 */
creditsRouter.get("/history", async (c) => {
  const auth = c.get("auth");

  const history = await db
    .select()
    .from(creditLogs)
    .where(eq(creditLogs.userId, auth.userId))
    .orderBy(desc(creditLogs.timestamp))
    .limit(100);

  return c.json({ history });
});
```

**Step 2: Register credits route**

Modify `apps/api/src/routes/app.ts`:

```typescript
import { creditsRouter } from "./credits";

// ... existing code ...

appRouter.route("/compile", compileRouter);
appRouter.route("/documents", documentsRouter);
appRouter.route("/credits", creditsRouter);
```

**Step 3: Test credits endpoints**

```bash
curl http://localhost:3000/credits/balance \
  -H "Authorization: Bearer test-token"
```

Expected: Returns credit balance

**Step 4: Commit**

```bash
git add apps/api/src/routes/credits.ts apps/api/src/routes/app.ts
git commit -m "feat(api): implement credits endpoints"
```

---

## Task 4: Implement Sources Endpoints

**Files:**

- Create: `apps/api/src/routes/sources.ts`
- Modify: `apps/api/src/routes/app.ts`

\*\*Context: Source management for documents with RAG integration.

**Step 1: Create sources route**

Create `apps/api/src/routes/sources.ts`:

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@10xstudent/database";
import { sources, documents } from "@10xstudent/database/schema";
import { eq, and } from "drizzle-orm";

const addSourceSchema = z.object({
  documentId: z.string().uuid(),
  url: z.string().url(),
  title: z.string().min(1),
  author: z.string().optional(),
  publicationDate: z.string().datetime().optional(),
  content: z.string(),
});

export const sourcesRouter = new Hono();

/**
 * GET /sources/:documentId
 * List all sources for a document
 */
sourcesRouter.get("/:documentId", async (c) => {
  const auth = c.get("auth");
  const documentId = c.req.param("documentId");

  // Verify user owns document
  const [document] = await db
    .select()
    .from(documents)
    .where(
      and(eq(documents.id, documentId), eq(documents.userId, auth.userId)),
    );

  if (!document) {
    return c.json({ error: "Document not found" }, 404);
  }

  const documentSources = await db
    .select()
    .from(sources)
    .where(eq(sources.documentId, documentId));

  return c.json({ sources: documentSources });
});

/**
 * POST /sources
 * Add source to document (queues embedding generation)
 */
sourcesRouter.post("/", zValidator("json", addSourceSchema), async (c) => {
  const auth = c.get("auth");
  const data = c.req.valid("json");

  // Verify user owns document
  const [document] = await db
    .select()
    .from(documents)
    .where(
      and(eq(documents.id, data.documentId), eq(documents.userId, auth.userId)),
    );

  if (!document) {
    return c.json({ error: "Document not found" }, 404);
  }

  const [source] = await db
    .insert(sources)
    .values({
      ...data,
      accessDate: new Date(),
      publicationDate: data.publicationDate
        ? new Date(data.publicationDate)
        : null,
    })
    .returning();

  // TODO: Queue embedding generation job in BullMQ

  return c.json({ source }, 201);
});

/**
 * DELETE /sources/:id
 * Delete source
 */
sourcesRouter.delete("/:id", async (c) => {
  const auth = c.get("auth");
  const soceId = c.req.param("id");

  // Get source and verify ownership through document
  const [source] = await db
    .select({
      id: sources.id,
      documentId: sources.documentId,
      userId: documents.userId,
    })
    .from(sources)
    .innerJoin(documents, eq(sources.documentId, documents.id))
    .where(eq(sources.id, sourceId));

  if (!source || source.userId !== auth.userId) {
    return c.json({ error: "Source not found" }, 404);
  }

  await db.delete(sources).where(eq(sources.id, sourceId));

  return c.json({ success: true });
});
```

**Step 2: Register sources route**

Modify `apps/api/src/routes/app.ts`:

```typescript
import { sourcesRouter } from "./sources";

// ... existing code ...

appRouter.route("/compile", compileRouter);
appRouter.route("/documents", documentsRouter);
appRouter.route("/credits", creditsRouter);
appRouter.route("/sources", sourcesRouter);
```

**Step 3: Commit**

```bash
git add apps/api/src/routes/sources.ts apps/api/src/routes/app.ts
git commit -m "feat(api): implement sources endpoints"
```

---

## Task 5: Implement AI Chat Endpoint with SSE

**Files:**

- Create: `apps/api/src/routes/chat.ts`
- Create: `apps/api/src/services/ai-chat.ts`
- Modify: `apps/api/src/routes/app.ts`
- Modify: `apps/api/package.json` (add dependencies)

**Context:** Server-Sent Events (SSE) streaming endpoint for AI chat with tool execution.

**Step 1: Add TanStack AI dependencies**

Modify `apps/api/package.json`:

```json
{
  "dependencies": {
    "@10xstudent/database": "*",
    "@10xstudent/domain": "*",
    "@10xstudent/ai-tools": "*",
    "@clerk/clerk-sdk-node": "^5.1.6",
    "@hono/zod-validator": "^0.7.6",
    "@tanstack/ai": "^0.3.1",
    "hono": "^4.11.7",
    "pino": "^10.3.0",
    "zod": "^4.3.6"
  }
}
```

Run: `bun install` (in apps/api)

**Step 2: Create AI chat service**

Create `apps/api/src/services/ai-chat.ts`:

```typescript
import { generateText } from "@tanstack/ai";
import { webSearchDef } from "@10xstudent/ai-tools/research";
import { addSourceDef } from "@10xstudent/ai-tools/research";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  messages: ChatMessage[];
  documentId: string;
  userId: string;
}

/**
 * AI Chat service using TanStack AI with Google Gemini
 */
export class AIChatService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("GOOGLE_API_KEY environment variable is required");
    }
  }

  /**
   * Generate AI response with tool execution
   */
  async chat(options: ChatOptions) {
    // TODO: Implement full TanStack AI integration with tools
    // This is a placeholder for Phase 5 detailed implementation

    return {
      role: "assistant" as const,
      content: "AI chat endpoint placeholder - full implementation in Phase 5",
    };
  }
}
```

**Step 3: Create chat route with SSE**

Create `apps/api/src/routes/chat.ts`:

```typescripmport { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AIChatService } from '../services/ai-chat';

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ),
  documentId: z.string().uuid(),
});

export const chatRouter = new Hono();

const aiService = new AIChatService();

/**
 * POST /chat
 * AI chat with SSE streaming
 */
chatRouter.post('/', zValidator('json', chatSchema), async (c) => {
  const auth = c.get('auth');
  const { messages, documentId } = c.req.valid('json');

  return streamSSE(c, async (stream) => {
    try {
      // TODO: Implement streaming response
      // For now, send simple response
      await stream.writeSSE({
        data: JSON.stringify({
          type: 'message',
          content: 'AI chat streaming - full implementation in Phase 5',
        }),
      });

      await stream.writeSSE({
        data: JSON.stringify({ type: 'done' }),
      });
    } catch (error) {
      await stream.writeSSE({
        data: JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      });
    }
  });
});
```

**Step 4: Register chat route**

Modify `apps/api/src/routes/app.ts`:

```typescript
import { chatRouter } from "./chat";

// ... existing code ...

appRouter.route("/compile", compileRouter);
appRouter.route("/documents", documentsRouter);
appRouter.route("/credits", creditsRouter);
appRouter.route("/sources", sourcesRouter);
appRouter.route("/chat", chatRouter);
```

**Step 5: Commit**

```bash
git add apps/api/package.json apps/api/src/services/ai-chat.ts apps/api/src/routes/chat.ts apps/api/src/routes/app.ts
git commit -m "feat(api): add AI chat endpoint with SSE streaming placeholder"
```

---

## Verification Checklist

Before moving to Phase 3, verify:

- [ ] `/api/compile` endpoint compiles Typst to PDF
- [ ] `/api/documents` CRUD endpoints work
- [ ] `/api/credits` endpoints return balance and history
- [ ] `/api/sources` endpoints manage sources
- [ ] `/api/chat` endpoint exists (placeholder for Phase 5)
- [ ] All endpoints require authentication
- [ ] Users can only access their own resou[ ] All changes are committed to git

---

## Next Steps

After completing Phase 2:

1. Proceed to Phase 3: `03-frontend-dependencies.md`
2. Install frontend dependencies (CodeMirror, TanStack Query, Zustand, Clerk)
3. Set up providers and configuration

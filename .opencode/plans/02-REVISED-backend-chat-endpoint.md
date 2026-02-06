# Phase 2: Backend API - Single Chat Endpoint Pattern

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement `/api/compile` and `/api/chat` endpoints following the single-endpoint pattern where all server tools execute within `/api/chat`.

**Architecture:** Hono API with SSE streaming, TanStack AI server tools, Typst Docker compilation, pessimistic credit locking, Clerk webhooks.

**Tech Stack:** Hono, TanStack AI, Drizzle ORM, Clerk, Zod, Typst CLI (Docker)

---

## Prerequisites

- Phase 1 completed (Docker infrastructure running)
- Database migrations run
- BullMQ worker running

---

## Task 1: Implement Typst Compilation Endpoint

**Files:**
- Create: `apps/api/src/services/typst-compiler.ts`
- Create: `apps/api/src/routes/compile.ts`
- Modify: `apps/api/src/routes/app.ts`

**Context:** `/api/compile` endpoint for server-side Typst compilation with Docker exec.

**Step 1: Create Typst compiler service**

Create `apps/api/src/services/typst-compiler.ts`:

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';

const execAsync = promisify(exec);

export interface CompileResult {
  success: boolean;
  pdf?: Buffer;
  error?: string;
  compilationTime: number;
}

export class TypstCompiler {
  private workspaceDir = '/workspace';
  private containerName = '10xstudent-typst';

  private hashContent(source: string): string {
    return crypto.createHash('sha256').update(source).digest('hex');
  }

  async compile(source: string): Promise<CompileResult> {
    const startTime = Date.now();
    const contentHash = this.hashContent(source);
    const inputFile = `${contentHash}.typ`;
    const outputFile = `${contentHash}.pdf`;

    try {
      const inputPath = join(process.cwd(), 'tmp/typst-workspace', inputFile);
      const outputPath = join(process.cwd(), 'tmp/typst-workspace', outputFile);

      await writeFile(inputPath, source, 'utf-8');

      const command = `docker exec ${this.containerName} typst compile ${this.workspaceDir}/${inputFile} ${this.workspaceDir}/${outputFile}`;

      await execAsync(command, { timeout: 30000 });

      const pdf = await readFile(outputPath);

      await Promise.all([
        unlink(inputPath).catch(() => {}),
        unlink(outputPath).catch(() => {}),
      ]);

      return {
        success: true,
        pdf,
        compilationTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Compilation failed',
        compilationTime: Date.now() - startTime,
      };
    }
  }
}
```

**Step 2: Create compile route**

Create `apps/api/src/routes/compile.ts`:

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { TypstCompiler } from '../services/typst-compiler';

const compileSchema = z.object({
  typstContent: z.string().min(1).max(100000),
});

export const compileRouter = new Hono();
const compiler = new TypstCompiler();

compileRouter.post('/', zValidator('json', compileSchema), async (c) => {
  const { typstContent } = c.req.valid('json');

  const result = await compiler.compile(typstContent);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  c.header('X-Compilation-Time', result.compilationTime.toString());
  c.header('Content-Type', 'application/pdf');

  return c.body(result.pdf!);
});
```

**Step 3: Register route**

Modify `apps/api/src/routes/app.ts`:

```typescript
import { compileRouter } from './compile';

// ... existing code ...

appRouter.use('/*', authMiddleware);
appRouter.route('/compile', compileRouter);
```

**Step 4: Test endpoint**

Run: `bun run dev` (in apps/api)

Test:
```bash
curl -X POST http://localhost:3000/compile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"typstContent": "= Hello World"}' \
  --output test.pdf
```

**Step 5: Commit**

```bash
git add apps/api/src/services/typst-compiler.ts apps/api/src/routes/compile.ts apps/api/src/routes/app.ts
git commit -m "feat(api): implement Typst compilation endpoint"
```

---

## Task 2: Implement Server Tools for /api/chat

**Files:**
- Create: `apps/api/src/tools/web-search.ts`
- Create: `apps/api/src/tools/add-source.ts`
- Create: `apps/api/src/tools/query-sources-rag.ts`
- Create: `apps/api/src/tools/save-document.ts`
- Create: `apps/api/src/tools/check-credits.ts`
- Create: `apps/api/src/tools/get-next-citation-number.ts`
- Create: `apps/api/src/tools/add-citation.ts`
- Create: `apps/api/src/tools/update-bibliography.ts`

**Context:** Per Spec 2, all server tools execute WITHIi/chat` endpoint, not as separate routes.

**Step 1: Create webSearch tool**

Create `apps/api/src/tools/web-search.ts`:

```typescript
import { z } from 'zod';

export const webSearchSchema = z.object({
  query: z.string(),
  maxResults: z.number().default(5),
});

export async function webSearchTool(params: z.infer<typeof webSearchSchema>) {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query: pams.query,
      max_results: params.maxResults,
    }),
  });

  if (!response.ok) {
    throw new Error('Web search failed');
  }

  const data = await response.json();
  
  return data.results.map((r: any) => ({
    url: r.url,
    title: r.title,
    snippet: r.snippet,
    content: r.content,
  }));
}
```

**Step 2: Create addSource tool**

Create `apps/api/src/tools/add-source.ts`:

```typescript
import { z } from 'zod';
import { db } from '@10xstudent/database';
import { sources } from '@10xstudent/database/schema';

export const addSourceSchema = z.object({
  documentId: z.string().u),
  url: z.string().url(),
  title: z.string(),
  author: z.string().optional(),
  publicationDate: z.string().optional(),
  content: z.string(),
});

export async function addSourceTool(params: z.infer<typeof addSourceSchema>) {
  // Create source with embedding=null (BullMQ will generate later)
  const [source] = await db
    .insert(sources)
    .values({
      documentId: params.documentId,
      url: params.url,
      title: params.title,
      author: params.author || null,
      publicationDate: params.publicationDate ? new Date(params.publicationDate) : null,
      content: params.content,
      accessDaate(),
      embedding: null, // Generated asynchronously by BullMQ
      metadata: {
        sourceType: 'web',
        isAvailable: true,
      },
    })
    .returning();

  return { sourceId: source.id };
}
```

**Step 3: Create querySourcesRAG tool**

Create `apps/api/src/tools/query-sources-rag.ts`:

```typescript
import { z } from 'zod';
import { db } from '@10xstudent/database';
import { sources } from '@10xstudent/database/schema';
import { eq, isNotNull, sql } from 'drizzle-orm';

export const querySourcesRAGSchema = z.object({
  documetring().uuid(),
  query: z.string(),
  topK: z.number().default(3),
});

export async function querySourcesRAGTool(params: z.infer<typeof querySourcesRAGSchema>) {
  // Generate query embedding
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GOOGLE_API_KEY || '',
      },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text: params.query }] },
      }),
    n  const data = await response.json();
  const queryEmbedding = data.embedding.values;

  // Semantic search using pgvector
  const results = await db
    .select()
    .from(sources)
    .where(
      and(
        eq(sources.documentId, params.documentId),
        isNotNull(sources.embedding)
      )
    )
    .orderBy(
      sql`embedding <=> ${JSON.stringify(queryEmbedding)}::vector`
    )
    .limit(params.topK);

  return results.map(r => ({
    sourceId: r.id,
    title: r.title,
    content: r.content,
    url: r.url,
  }));
}
```

**Step 4: Create remaining tools**

Create similar files for:
- `save-document.ts` (updates document.typstContent)
- `check-credits.ts` (pessimistic locking)
- `get-next-citation-number.ts` (atomic increment)
- `add-citation.ts` (inserts into citations table)
- `update-bibliography.ts` (regenerates from citations)

**Step 5: Commit**

```bash
git add apps/api/src/tools/
git commit -m "feat(api): implement server tools for AI chat"
```

---

## Task 3: Implement /api/chat Endpoint with SSE

**Files:**
- Create: `apps/api/src/routes/chat.ts`
- Modify: `apps/api/src/routes/app.ts`

**Context:** Single endpoint pattern - all server tools execute within this endpoint using TanStack AI.

**Step 1: Add TanStack AI dependency**

Modify `apps/api/package.json`:

```json
{
  "dependencies": {
    "@tanstack/ai": "^0.3.1",
    // ... existing deps
  }
}
```

Run: `bun install`

**Step 2: Create chat route**

Create `apps/api/src/routes/chat.ts`:

```typescript
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { generateText } from '@tanstack/ai';
import { webSearchTool, webSearchSchema } from '../tools/web-search';
import { addSourceTool, addSourceSchema } from '../tools/add-source';
// ... import other tools

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

chatRouter.post('/', zValidator('json', chatSchema), async (c) => {
  const auth = c.get('auth');
  const { messages, documentId } = c.req.valid('json');

  return streamSSE(c, async (stream) => {
    try {
      // TanStack AI with server tools
      const result = await generateText({
        model: 'gemini-2.0-flash-thinking-exp',
        apiKey: process.env.GOOGLE_API_KEY,
        messages,
        tools: {
          webSearch: {
            description: 'Search the web for relevant sources',
            parameters: webSearchSchema,
            execute: webSearchTool,
          },
          addSource: {
            description: 'Add a source to the document',
            parameters: addSourceSchema,
            execute: addSourceTool,
          },
          // ... register other tools
        },
        onStepFinish: async (step) => {
          // Stream progress to client
          await stream.writeSSE({
            data: JSON.stringify({
   type: 'step',
              step: step.type,
              content: step.text,
            }),
          });
        },
      });

      await stream.writeSSE({
        data: JSON.stringify({
          type: 'done',
          content: result.text,
        }),
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

**Step 3: Register route**

Modify `apps/api/src/routes/app.ts`:

```typescript
import { chatRouter } from './chat';

// ... existing code ...

appRouter.route('/chat', chatRouter);
```

**Step 4: Commit**

```bash
git add apps/api/src/routes/chat.ts apps/api/src/routes/app.ts apps/api/package.json
git commit -m "feat(api): implement /api/chat with SSE and server tools"
```

---

## Task 4: Implement Clerk Webhook Handler

**Files:**
- Create: `apps/api/src/routes/webhooks.ts`
- Modify: `apps/api/src/routes/app.ts`

**Context:** Handle `user.created` event to initialize users with 10,000 credits.

**Step 1: Create webhook route**

Create `apps/api/src/routes/webhooks.ts`:

```typescript
import { Hono } from 'hono';
import { db } from '@10xstudent/database';
import { users } from '@10xstudent/database/schema';

export const webhooksRouter = new Hono();

webhooksRouter.post('/clerk', async (c) => {
  const event = await c.req.json();

  if (event.type === 'user.created') {
    const userId = event.data.id;

    await db.insert(users).values({
      id: userId,
      credits: 10000,
      preferences: {
        defaultCitationFormat: 'APA',
        defaultResearchDepth: 'quick',
      },
      creditsResetAt: new Date(),
    });urn c.json({ success: true });
  }

  return c.json({ success: true });
});
```

**Step 2: Register route (no auth)**

Modify `apps/api/src/routes/app.ts`:

```typescript
import { webhooksRouter } from './webhooks';

// ... existing code ...

// Public routes (before auth middleware)
appRouter.route('/webhooks', webhooksRouter);

// Protected routes
appRouter.use('/*', authMiddleware);
```

**Step 3: Commit**

```bash
git add apps/api/src/routes/webhooks.ts apps/api/src/routes/app.ts
git commit -m "feat(api): implement Clerk webhook for user creation"
```

---

## Verification Checklist

Before moving to Phase 3, verify:

- [ ] `/api/compile` endpoint compiles Typst to PDF
- [ ] `/api/chat` endpoint streams SSE responses
- [ ] Server tools execute within `/api/chat`
- [ ] BullMQ worker generates embeddings asynchronously
- [ ] Clerk webhook creates user records
- [ ] All endpoints require authentication (except webhooks)
- [ ] All changes committed to git

---

## Next Steps

After completing Phase 2:
1. Proceed to Phase 3: `03-REVISED-frontend-layout-state.md`
2. Set up 3-pane layout
3. Configure state management (Zustand + EditorContext)
4. Install frontend dependencies

# Critical Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical architectural gaps and security vulnerabilities identified in plan review before starting Phase 1 implementation.

**Architecture:** Add missing implementations for credit system, security measures, and complete server tool definitions.

**Tech Stack:** TypeScript, Drizzle ORM, Clerk, Zod, BullMQ

---

## Task 1: Implement Complete Credit System with Pessimistic Locking

**Files:**

- Create: `apps/api/src/tools/check-credits.ts`
- Create: `apps/api/src/tools/deduct-credits.ts`
- Create: `apps/api/src/services/credit-manager.ts`

**Context:** Credit system is core to business model. Must implement pessimistic locking to prevent overdraft.

**Step 1: Create credit manager service**

Create `apps/api/src/services/credit-manager.ts`:

```typescript
import { db } from "@10xstudent/database";
import { users, creditLogs } from "@10xstudent/database/schema";
import { eq, sql } from "drizzle-orm";

export class CreditManager {
  /**
   * Check if user has enough credits (with pessimistic lock)
   * Returns locked user record or throws error
   */
  async reserveCredits(userId: string, estimatedCost: number) {
    return await db.transaction(async (tx) => {
      // Lock user row for update
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .for("update");

      if (!user) {
        throw new Error("User not found");
      }

      if (user.credits < estimatedCost) {
        throw new Error(
          `Insufficient credits. Have: ${user.credits}, Need: ${estimatedCost}`,
        );
      }

      // Reserve credits (subtract)
      await tx
        .update(users)
        .set({ credits: sql`${users.credits} - ${estimatedCost}` })
        .where(eq(users.id, userId));

      return {
        userId,
        reservedAmount: estimatedCost,
        remainingCredits: user.credits - estimatedCost,
      };
    });
  }

  /**
   * Deduct actual credits used and refund difference
   */
  async finalizeCredits(
    userId: string,
    operation: string,
    reservedAmount: number,
    actualCost: number,
    tokensUsed?: number,
  ) {
    return await db.transaction(async (tx) => {
      const refund = reservedAmount - actualCost;

      if (refund > 0) {
        // Refund unused credits
        await tx
          .update(users)
          .set({ credits: sql`${users.credits} + ${refund}` })
          .where(eq(users.id, userId));
      } else if (refund < 0) {
        // Deduct additional credits if needed
        await tx
          .update(users)
          .set({ credits: sql`${users.credits} - ${Math.abs(refund)}` })
          .where(eq(users.id, userId));
      }

      // Log credit transaction
      await tx.insert(creditLogs).values({
        userId,
        operation,
        cost: actualCost,
        tokensUsed,
      });

      return { refunded: refund, finalCost: actualCost };
    });
  }

  /**
   * Rollback reserved credits on error
   */
  async rollbackCredits(userId: string, amount: number) {
    await db
      .update(users)
      .set({ credits: sql`${users.credits} + ${amount}` })
      .where(eq(users.id, userId));
  }
}
```

**Step 2: Create checkCredits tool**

Create `apps/api/src/tools/check-credits.ts`:

```typescript
import { z } from "zod";
import { db } from "@10xstudent/database";
import { users } from "@10xstudent/database/schema";
import { eq } from "drizzle-orm";

export const checkCreditsSchema = z.object({
  userId: z.string().uuid(),
  estimatedCost: z.number().min(0),
});

export async function checkCreditsTool(
  params: z.infer<typeof checkCreditsSchema>,
) {
  const [user] = await db
    .select({ credits: users.credits })
    .from(users)
    .where(eq(users.id, params.userId));

  if (!user) {
    throw new Error("User not found");
  }

  const hasEnough = user.credits >= params.estimatedCost;

  return {
    credits: user.credits,
    hasEnough,
    shortfall: hasEnough ? 0 : params.estimatedCost - user.credits,
  };
}
```

**Step 3: Commit**

```bash
git add apps/api/src/services/credit-manager.ts apps/api/src/tools/check-credits.ts
git commit -m "feat(api): implement credit system with pessimistic locking"
```

---

## Task 2: Implement Remaining Server Tools

**Files:**

- Create: `apps/api/src/tools/save-document.ts`
- Create: `apps/api/src/tools/get-next-citation-number.ts`
- Create: `apps/api/src/tools/add-citation.ts`
- Create: `apps/api/src/tools/update-bibliography.ts`

**Step 1: Create saveDocument tool**

Create `apps/api/src/tools/save-document.ts`:

```typescript
import { z } from "zod";
import { db } from "@10xstudent/database";
import { documents } from "@10xstudent/database/schema";
import { eq, and } from "drizzle-orm";

export const saveDocumentSchema = z.object({
  documentId: z.string().uuid(),
  userId: z.string().uuid(),
  typstContent: z.string().max(100000),
});

export async function saveDocumentTool(params: z.infer<typeocumentSchema>) {
  const [document] = await db
    .update(documents)
    .set({
      typstContent: params.typstContent,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documents.id, params.documentId),
        eq(documents.userId, params.userId),
      ),
    )
    .returning();

  if (!document) {
    throw new Error("Document not found or access denied");
  }

  return {
    success: true,
    documentId: document.id,
    updatedAt: document.updatedAt,
  };
}
```

**Step 2: Create getNextCitationNumber tool**

Create `apps/api/src/tools/get-next-citation-number.ts`:

```typescript
import { z } from "zod";
import { db } from "@10xstudent/database";
import { documents } from "@10xstudent/database/schema";
import { eq, sql } from "drizzle-orm";

export const getNextCitationNumberSchema = z.object({
  documentId: z.string().uuid(),
});

export async function getNextCitationNumberTool(
  params: z.infer<typeof getNextCitationNumberSchema>,
) {
  // Atomic increment of citation counter
  const [document] = await db
    .update(documents)
    .set({
      citationCount: sql`${documents.citationCount} + 1`,
    })
    .where(eq(documents.id, params.documentId))
    .returning({ citmber: documents.citationCount });

  if (!document) {
    throw new Error("Document not found");
  }

  return { citationNumber: document.citationNumber };
}
```

**Step 3: Create addCitation tool**

Create `apps/api/src/tools/add-citation.ts`:

```typescript
import { z } from "zod";
import { db } from "@10xstudent/database";
import { citations } from "@10xstudent/database/schema";

export const addCitationSchema = z.object({
  documentId: z.string().uuid(),
  sourceId: z.string().uuid(),
  citationNumber: z.number().int().positive(),
  position: z.number().int().min(0),
});

export async function addCitationTool(
  params: z.infer<typeof addCitationSchema>,
) {
  const [citation] = await db
    .insert(citations)
    .values({
      documentId: params.documentId,
      sourceId: params.sourceId,
      citationNumber: params.citationNumber,
      position: params.position,
    })
    .returning();

  return { citationId: citation.id, citationNumber: citation.citationNumber };
}
```

**Step 4: Create updateBibliography tool**

Create `apps/api/src/tools/update-bibliography.ts`:

```typescript
import { z } from 'zod';
import { db } from '@10xstudent/database';
import { citations, sources, documents } from '@10xstudent/database/schema';
import { eq } from 'drizzle-orm';

export const updateBibliographySchema = z.object({
  documentId: z.string().uuid(),
  format: z.enum(['APA', 'MLA', 'Chicago']),
});

export async function updateBibliographyTool(params: z.infer<typeof updateBibliographySchema>) {
  // Get all cited sources
  const citedSources = await db
    .select({
      citationNumber: citations.citationNumber,
      title: sources.title,
      author: sources.author,
      url: sources.url,
      publicationDate: sources.publicationDate,
    })
    .from(citations)
    .innerJoin(sourcestions.sourceId, sources.id))
    .where(eq(citations.documentId, params.documentId))
    .orderBy(citations.citationNumber);

  // Format bibliography based on citation style
  let bibliography = '\n\n= References\n\n';

  for (const source of citedSources) {
    if (params.format === 'APA') {
      // APA format: Author. (Year). Title. URL
      const year = source.publicationDate ? new Date(source.publicationDate).getFullYear() : 'n.d.';
      bibliography += `${source.citationNumber}. ${source.author || 'Unknown'}. (${year}). ${source.title}. ${source.url}\n\n`;
    } else if (params.format === 'MLA') {
      // MLA format: Author. "Title." Website, URL.
      bibliphy += `${source.citationNumber}. ${source.author || 'Unknown'}. "${source.title}." ${source.url}\n\n`;
    } else if (params.format === 'Chicago') {
      // Chicago format: Author. "Title." Accessed date. URL.
      bibliography += `${source.citationNumber}. ${source.author || 'Unknown'}. "${source.title}." ${source.url}\n\n`;
    }
  }

  return { bibliography, sourceCount: citedSources.length };
}
```

**Step 5: Commit**

```bash
git add apps/api/src/tools/save-document.ts apps/api/src/tools/get-next-citation-number.ts apps/api/src/tools/add-citation.ts apps/api/src/tools/update-bibliography.ts
git commit -m "feat(api): implement remaining server tools for AI chat"
```

---

## Task 3: Add Clerk Webhook Signature Verification

**Files:**

- Modify: `apps/api/src/routes/webhooks.ts`
- Modify: `apps/api/package.json`

**Context:** Critical security vulnerability - webhooks must verify Clerk signatures to prevent fake user creation.

**Step 1: Add svix dependency**

Modify `apps/api/package.json`:

```json
{
  "dependencies": {
    "svix": "^1.15.0"
  }
}
```

Run: `cd apps/api && bun install`

**Step 2: Update webhook handler with verification**

Modify `apps/api/src/routes/webhooks.ts`:

```typescript
import { Hono } from "hono";
import { Webhook } from "svix";
import { db } from "@10xstudent/database";
import { users } from "@10xstudent/database/schema";

export const webhooksRouter = new Hono();

webhooksRouter.post("/clerk", async (c) => {
  // Get webhook signature headers
  const svixId = c.req.header("svix-id");
  const svixTimestamp = c.req.header("svix-timestamp");
  const svixSignature = c.req.header("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return c.json({ error: "Missing webhook signature headers" }, 400);
  }

  // Get raw body
  const body = await c.req.text();

  // Verify webhook signature
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");

  let event;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return c.json({ error: "Invalid webhook signature" }, 401);
  }

  // Handle verified event
  if (event.type === "user.created") {
    const userId = event.data.id;

    await db.insert(users).values({
      id: userId,
      credits: 10000,
      preferences: {
        defaultCitationFormat: "APA",
        defaultResearchDepth: "quick",
      },
      creditsResetAt: new Date(),
    });

    return c.json({ success: true });
  }

  return c.json({ success: true });
});
```

**Step 3: Commit**

```bash
git add apps/api/package.json apps/api/src/routes/webhooks.ts
git commit -m "fix(api): add Clerk webhook signature verification"
```

---

## Task 4: Add Rate Limiting Middleware

**Files:**

- Create: `apps/api/src/middleware/rate-limit.ts`
- Modify: `apps/api/src/routes/chat.ts`
- Modify: `apps/api/src/routes/compile.ts`

**Context:** Prevent DoS attacks and API abuse.

**Step 1: Create rate limiting middleware**

Create `apps/api/src/middleware/rate-limit.ts`:

```typescript
import { createMiddleware } from "hono/factory";

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number };
}

const store: RateLimitStore = {};

export function rateLimitMiddleware(maxRequests: number, windowMs: number) {
  return createMiddleware(async (c, next) => {
    const auth = c.get("auth");
    const userId = auth?.userId;

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const now = Date.now();
    const userLimit = store[userId];

    if (!userLimit || now > userLimit.resetAt) {
      // Reset window
      store[userId] = {
        count: 1,
        resetAt: now + windowMs,
      };
      return next();
    }

    if (userLimit.count >= maxRequests) {
      const retryAfter = Math.ceil((userLimit.resetAt - now) / 1000);
      c.header("Retry-After", retryAfter.toString());
      return c.json(
        {
          error: "Rate limit exceeded",
          retryAfter,
        },
        429,
      );
    }

    userLimit.count++;
    return next();
  });
}
```

**Step 2: Apply to chat endpoint**

Modify `apps/api/src/routes/chat.ts`:

```typescript
import { rateLimitMiddleware } from "../middleware/rate-limit";

// Add before route handler
chatRouter.use("/", rateLimitMiddleware(10, 60000)); // 10 requests per minute
```

**Step 3: Apply to compile endpoint**

Modify `apps/api/src/routes/compile.ts`:

```typescript
import { rateLimitMiddleware } from "../middleware/rate-limit";

// Add before route handler
compileRouter.use("/", rateLimitMiddleware(10, 60000)); // 10 compilations per minute
```

**Step 4: Commit**

```bash
git add apps/api/src/middleware/rate-limit.ts apps/api/src/routes/chat.ts apps/api/src/routes/compile.ts
git commit -m "feat(api): add rate limiting to prevent abuse"
```

---

## Task 5: Update Phase 1 Plan with pgvector Migration

**Files:**

- Modify: `.opencode/plans/01-REVISED-infrastructure-database.md`

**Context:** Ensure pgvector extension is in migration, not manual step.

**Step 1: Verify migration exists**

Run: `ls packages/database/src/migrations/`

Expected: See `0001_enable_pgvector.sql`

**Step 2: Verify migration content**

Run: `cat packages/database/src/migrations/0001_enable_pgvector.sql`

Expected content:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE INDEX IF NOT EXISTS sources_embedding_idx
ON sources USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**Step 3: Update plan to reference migration**

Modify `.opencode/plans/01-REVISED-infrastructure-database.md` Task 4, Step 3:

Change from manual `CREATE EXTENSION` to:

```markdown
**Step 3: Verify pgvector extension from migration**

Run: `docker-compose exec postgres psql -U postgres -d 10xstudent -c "SELECT extname FROM pg_extension WHERE extname = 'vector';"`

Expected: `vector` (installed by migration 0001)
```

**Step 4: Commit**

```bash
git add .opencode/plans/01-REVISED-infrastructure-database.md
git commit -m "docs(plans): clarify pgvector installed via migration"
```

---

## Verification Checklist

Before proceeding to Phase 1 implementation, verify:

- [ ] Credit system implemented with pessimistic locking
- [ ] All 5 server tools implemented (saveDocument, checkCredits, getNextCitationNumber, addCitation, updateBibliography)
- [ ] Clerk webhook signature verification added
- [ ] Rate limiting middleware implemented
- [ ] pgvector migration verified
- [ ] All code compiles without errors
- [ ] All commits pushed to git

---

## Next Steps

After completing these critical fixes:

1. Review updated plans
2. Begin Phase 1 implementation: `01-REVISED-infrastructure-database.md`
3. Use `@superpowers/executing-plans` skill for execution

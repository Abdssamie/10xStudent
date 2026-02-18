# OpenAPI/Swagger Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Zod-based OpenAPI validation and Swagger documentation generation to the Hono API

**Architecture:** Replace manual Zod validation with `@hono/zod-openapi`, migrate from `Hono` to `OpenAPIHono`, use `createRoute` for type-safe route definitions, generate OpenAPI spec at `/api/v1/doc`

**Tech Stack:** `@hono/zod-openapi`, `@scalar/hono-api-reference` (Swagger UI)

---

## Task 1: Install Dependencies

**Files:**
- Modify: `api/package.json`

**Step 1: Install packages**

Run: `cd api && bun add @hono/zod-openapi @scalar/hono-api-reference`

**Step 2: Verify installation**

Run: `cd api && bun run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add api/package.json api/bun.lockb
git commit -m "chore: add OpenAPI dependencies"
```

---

## Task 2: Create Shared Zod Schemas

**Files:**
- Create: `shared/src/api/documents.ts`
- Create: `shared/src/api/sources.ts`
- Create: `shared/src/api/citations.ts`
- Create: `shared/src/api/assets.ts`
- Create: `shared/src/api/credits.ts`
- Create: `shared/src/api/chat.ts`
- Modify: `shared/src/index.ts`

**Step 1: Create documents schemas**

```typescript
// shared/src/api/documents.ts
import { z } from "zod";
import { createDocumentSchema } from "../document";

export const documentResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  template: z.string(),
  typstKey: z.string(),
  citationFormat: z.string(),
  citationCount: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const updateDocumentBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  template: z.string().optional(),
  citationFormat: z.enum(["APA", "MLA", "Chicago"]).optional(),
});

export { createDocumentSchema };
```

**Step 2: Create sources schemas**

```typescript
// shared/src/api/sources.ts
import { z } from "zod";
import { createSourceSchema, updateSourceSchema } from "../source";

export const sourceResponseSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  title: z.string().nullable(),
  author: z.string().nullable(),
  sourceType: z.string(),
  publicationDate: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export { createSourceSchema, updateSourceSchema };
```

**Step 3: Create citations schemas**

```typescript
// shared/src/api/citations.ts
import { z } from "zod";

export const createCitationBodySchema = z.object({
  sourceId: z.string().uuid(),
  position: z.number().int().min(0),
});

export const citationResponseSchema = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  sourceId: z.string().uuid(),
  citationNumber: z.number(),
  position: z.number(),
  createdAt: z.string().datetime(),
});
```

**Step 4: Create assets schemas**

```typescript
// shared/src/api/assets.ts
import { z } from "zod";

export const assetResponseSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  contentType: z.string(),
  size: z.number(),
  createdAt: z.string().datetime(),
});
```

**Step 5: Create credits schemas**

```typescript
// shared/src/api/credits.ts
import { z } from "zod";

export const creditsBalanceResponseSchema = z.object({
  balance: z.number(),
  creditsResetAt: z.string().datetime(),
  usedThisMonth: z.number(),
});

export const creditLogResponseSchema = z.object({
  id: z.string().uuid(),
  operation: z.string(),
  cost: z.number(),
  tokensUsed: z.number().nullable(),
  timestamp: z.string().datetime(),
});

export const creditsHistoryResponseSchema = z.object({
  logs: z.array(creditLogResponseSchema),
  hasMore: z.boolean(),
  cursor: z.string().uuid().optional(),
});
```

**Step 6: Create chat schemas**

```typescript
// shared/src/api/chat.ts
import { z } from "zod";
import { chatMessageSchema } from "../ai/chat-message";

export const chatRequestBodySchema = z.object({
  documentId: z.string().uuid(),
  messages: z.array(chatMessageSchema).min(1),
});

export const chatMessageResponseSchema = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  role: z.enum(["user", "assistant", "tool"]),
  content: z.string(),
  createdAt: z.string().datetime(),
});
```

**Step 7: Export from shared index**

```typescript
// shared/src/index.ts - add these exports
export * from "./api/documents";
export * from "./api/sources";
export * from "./api/citations";
export * from "./api/assets";
export * from "./api/credits";
export * from "./api/chat";
```

**Step 8: Commit**

```bash
git add shared/src/api/ shared/src/index.ts
git commit -m "feat: add shared OpenAPI schemas"
```

---

## Task 3: Migrate Documents Route

**Files:**
- Modify: `api/src/routes/documents.ts`

**Step 1: Replace imports and setup**

```typescript
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { schema, eq, and } from "@/infrastructure/db";
import { authMiddleware } from "@/middleware/auth";
import { logger } from "@/utils/logger";
import { NotFoundError, ValidationError } from "@/infrastructure/errors";
import { requireDocumentOwnership } from "@/utils/ownership";
import {
  createDocumentSchema,
  documentResponseSchema,
  updateDocumentBodySchema,
} from "@shared";

const { documents } = schema;

export const documentsRouter = new OpenAPIHono();
```

**Step 2: Define POST route**

```typescript
const createDocumentRoute = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createDocumentSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: documentResponseSchema,
        },
      },
      description: "Document created successfully",
    },
  },
  tags: ["Documents"],
});

documentsRouter.openapi(createDocumentRoute, async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const services = c.get("services");
  const db = services.db;
  const storageService = services.storageService;

  const { title, template, citationFormat } = c.req.valid("json");

  const documentId = crypto.randomUUID();
  const stubContent = `= ${title}\n\n`;

  await storageService.uploadDocument(userId, documentId, stubContent);

  const typstKey = `documents/${userId}/${documentId}/main.typ`;

  const [document] = await db
    .insert(documents)
    .values({
      id: documentId,
      userId,
      title,
      template,
      typstKey,
      citationFormat,
    })
    .returning();

  return c.json(document);
});
```

**Step 3: Define GET list route**

```typescript
const listDocumentsRoute = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(documentResponseSchema),
        },
      },
      description: "List of user documents",
    },
  },
  tags: ["Documents"],
});

documentsRouter.openapi(listDocumentsRoute, async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const services = c.get("services");
  const db = services.db;

  const userDocuments = await db
    .select()
    .from(documents)
    .where(eq(documents.userId, userId));

  return c.json(userDocuments);
});
```

**Step 4: Define PATCH route**

```typescript
const updateDocumentRoute = createRoute({
  method: "patch",
  path: "/{id}",
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: updateDocumentBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: documentResponseSchema,
        },
      },
      description: "Document updated successfully",
    },
  },
  tags: ["Documents"],
});

documentsRouter.openapi(updateDocumentRoute, async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const { id: documentId } = c.req.valid("param");
  const services = c.get("services");
  const db = services.db;

  await requireDocumentOwnership(documentId, userId, db);

  const body = c.req.valid("json");
  const updates: Record<string, string> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.template !== undefined) updates.template = body.template;
  if (body.citationFormat !== undefined) updates.citationFormat = body.citationFormat;

  const [updated] = await db
    .update(documents)
    .set(updates)
    .where(eq(documents.id, documentId))
    .returning();

  return c.json(updated);
});
```

**Step 5: Define DELETE route**

```typescript
const deleteDocumentRoute = createRoute({
  method: "delete",
  path: "/{id}",
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    204: {
      description: "Document deleted successfully",
    },
  },
  tags: ["Documents"],
});

documentsRouter.openapi(deleteDocumentRoute, async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const { id: documentId } = c.req.valid("param");
  const services = c.get("services");
  const db = services.db;
  const storageService = services.storageService;

  const document = await requireDocumentOwnership(documentId, userId, db);

  try {
    await storageService.deleteDocument(userId, documentId);
  } catch (error) {
    logger.error({ error, documentId }, "Failed to delete from R2 - continuing with DB deletion");
  }

  await db
    .delete(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));

  return c.body(null, 204);
});
```

**Step 6: Run typecheck**

Run: `cd api && bun run typecheck`
Expected: No errors

**Step 7: Commit**

```bash
git add api/src/routes/documents.ts
git commit -m "feat: migrate documents route to OpenAPI"
```

---

## Task 4: Migrate Remaining Routes

**Files:**
- Modify: `api/src/routes/credits.ts`
- Modify: `api/src/routes/sources.ts`
- Modify: `api/src/routes/citations.ts`
- Modify: `api/src/routes/assets.ts`
- Modify: `api/src/routes/chat.ts`

**Step 1: Migrate credits.ts**

Follow same pattern: replace `Hono` with `OpenAPIHono`, use `createRoute`, add response schemas

**Step 2: Migrate sources.ts**

Follow same pattern

**Step 3: Migrate citations.ts**

Follow same pattern

**Step 4: Migrate assets.ts**

Follow same pattern (note: file upload uses `multipart/form-data`)

**Step 5: Migrate chat.ts**

Follow same pattern

**Step 6: Run typecheck**

Run: `cd api && bun run typecheck`
Expected: No errors

**Step 7: Commit**

```bash
git add api/src/routes/
git commit -m "feat: migrate all routes to OpenAPI"
```

---

## Task 5: Update App Router and Add OpenAPI Docs

**Files:**
- Modify: `api/src/routes/app.ts`
- Modify: `api/src/index.ts`

**Step 1: Update app.ts to use OpenAPIHono**

```typescript
import { OpenAPIHono } from "@hono/zod-openapi";
import { constructApiRoute } from "@/utils/router";
import { env } from "@/config/env";
import { assetsRouter } from "./assets";
import { chatRouter } from "./chat";
import { citationsRouter } from "./citations";
import { creditsRouter } from "./credits";
import { documentsRouter } from "./documents";
import { sourcesRouter } from "./sources";

export const appRouter = new OpenAPIHono();

appRouter.get("/", (c) => c.json({ message: "Welcome to 10xStudent API" }));

if (env.NODE_ENV === "development") {
  appRouter.get(constructApiRoute("/debug-sentry"), (c) => {
    throw new Error("Test error for Sentry integration");
  });
}

appRouter.route(constructApiRoute("/credits"), creditsRouter);
appRouter.route(constructApiRoute("/documents"), documentsRouter);
appRouter.route(constructApiRoute("/assets"), assetsRouter);
appRouter.route(constructApiRoute("/sources"), sourcesRouter);
appRouter.route(constructApiRoute("/chat"), chatRouter);
appRouter.route(constructApiRoute("/citations"), citationsRouter);

// OpenAPI spec endpoint
appRouter.doc31(constructApiRoute("/doc"), {
  openapi: "3.1.0",
  info: {
    version: "1.0.0",
    title: "10xStudent API",
    description: "AI-powered research platform API",
  },
  servers: [
    {
      url: "http://localhost:3001",
      description: "Development server",
    },
  ],
});
```

**Step 2: Add Scalar UI in index.ts**

```typescript
import { apiReference } from "@scalar/hono-api-reference";

// After mounting appRouter, add:
app.get(
  "/reference",
  apiReference({
    spec: {
      url: "/api/v1/doc",
    },
  })
);
```

**Step 3: Run typecheck**

Run: `cd api && bun run typecheck`
Expected: No errors

**Step 4: Test locally**

Run: `cd api && bun run dev`
Visit: `http://localhost:3001/api/v1/doc` (JSON spec)
Visit: `http://localhost:3001/reference` (Swagger UI)

**Step 5: Commit**

```bash
git add api/src/routes/app.ts api/src/index.ts
git commit -m "feat: add OpenAPI spec and Swagger UI endpoints"
```

---

## Task 6: Update Type Declarations

**Files:**
- Modify: `api/src/middleware/auth.ts`

**Step 1: Update Hono module declaration**

```typescript
import type { OpenAPIHono } from "@hono/zod-openapi";

declare module "hono" {
  interface ContextVariableMap {
    auth: {
      userId: string;
      sessionId: string;
      orgId?: string;
    };
    services: ServiceContainer;
  }
}
```

**Step 2: Run typecheck**

Run: `cd api && bun run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add api/src/middleware/auth.ts
git commit -m "fix: update type declarations for OpenAPIHono"
```

---

## Verification

Run: `cd api && bun run dev`

1. Visit `http://localhost:3001/api/v1/doc` - should return OpenAPI JSON
2. Visit `http://localhost:3001/reference` - should show Swagger UI
3. Test an endpoint via Swagger UI
4. Run: `cd api && bun run typecheck` - should pass

---

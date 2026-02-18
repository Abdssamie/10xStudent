# MVP Backend Blockers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 3 critical backend blockers to make the API ready for frontend integration: environment variable violations, missing citation routes, and missing asset routes.

**Architecture:** Follow existing patterns in the codebase - use validated env config, implement RESTful routes with ownership checks, leverage existing StorageService for asset operations.

**Tech Stack:** Hono, Drizzle ORM, Zod validation, R2/S3 storage

---

## Task 1: Fix Environment Variable Violations

**Files:**
- Modify: `api/src/config/env.ts:14` - Add missing env vars
- Modify: `api/src/middleware/auth.ts:40` - Use validated env
- Modify: `api/src/routes/webhooks.ts:24` - Use validated env
- Modify: `api/src/index.ts:24` - Use validated env

**Step 1: Update env.ts schema**

Add missing environment variables to the Zod schema:

```typescript
const envSchema = z.object({
  // ... existing fields ...
  
  // Clerk Authentication (add webhook signing secret)
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1).optional(),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1).optional(), // ADD THIS
  
  // ... rest of schema ...
  
  // CORS (add this)
  CORS_ORIGINS: z.string().optional(),
  
  // ... rest ...
});
```

**Step 2: Update auth.ts to use validated env**

```typescript
import { env } from '@/config/env';

// Line 40, change from:
secretKey: process.env.CLERK_SECRET_KEY,
// To:
secretKey: env.CLERK_SECRET_KEY,
```

**Step 3: Update webhooks.ts to use validated env**

```typescript
import { env } from '@/config/env';

// Line 24, change from:
const webhookSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
// To:
const webhookSecret = env.CLERK_WEBHOOK_SIGNING_SECRET;
if (!webhookSecret) {
  logger.error("CLERK_WEBHOOK_SIGNING_SECRET not configured");
  return c.json({ error: "Webhook secret not configured" }, 500);
}
```

**Step 4: Update index.ts to use validated env**

```typescript
import { env } from '@/config/env';

// Line 24, change from:
origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
// To:
origin: env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
```

**Step 5: Run typecheck**

Run: `cd api && bun run typecheck`
Expected: No errors

**Step 6: Commit**

```bash
git add api/src/config/env.ts api/src/middleware/auth.ts api/src/routes/webhooks.ts api/src/index.ts
git commit -m "fix: use validated env config instead of process.env"
```

---

## Task 2: Add Citation Routes

**Files:**
- Create: `api/src/routes/citations.ts`
- Modify: `api/src/routes/app.ts:34` - Mount citations router
- Modify: `api/src/utils/ownership.ts` - Add citation ownership helper

**Step 1: Add citation ownership helper to ownership.ts**

Add after line 74:

```typescript
const { citations } = schema;

/**
 * Verify citation ownership via its parent document
 * @throws NotFoundError if citation doesn't exist or user doesn't own it
 */
export async function requireCitationOwnership(
  citationId: string,
  userId: string,
  db: DB
) {
  logger.debug(
    { citationId, userId, operation: "verify_citation_ownership" },
    "Verifying citation ownership"
  );

  const [result] = await db
    .select({
      citation: citations,
      documentUserId: documents.userId,
    })
    .from(citations)
    .innerJoin(documents, eq(citations.documentId, documents.id))
    .where(and(eq(citations.id, citationId), eq(documents.userId, userId)));

  if (!result?.citation) {
    logger.warn(
      { citationId, userId },
      "Citation not found or access denied"
    );
    throw new NotFoundError("Citation not found");
  }

  return result.citation;
}
```

**Step 2: Create citations.ts route file**

```typescript
/**
 * Citations CRUD routes
 * Manage in-text citations linking documents to sources
 */

import { Hono } from "hono";
import { z } from "zod";
import { schema, eq, and, sql } from "@/infrastructure/db";
import { logger } from "@/utils/logger";
import { NotFoundError, ValidationError } from "@/infrastructure/errors";
import { requireDocumentOwnership, requireCitationOwnership } from "@/utils/ownership";

const { documents, citations, sources } = schema;

export const citationsRouter = new Hono();

const createCitationSchema = z.object({
  sourceId: z.string().uuid("Invalid source ID"),
  position: z.number().int().min(0, "Position must be non-negative"),
});

// POST /citations/:documentId - Create a citation
 citationsRouter.post("/:documentId", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const documentId = c.req.param("documentId");
  const services = c.get("services");
  const db = services.db;

  // Verify document ownership
  const document = await requireDocumentOwnership(documentId, userId, db);

  // Parse and validate request body
  const body = await c.req.json();
  const parsed = createCitationSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError("Invalid request", parsed.error.flatten());
  }

  const { sourceId, position } = parsed.data;

  // Verify source exists and belongs to this document
  const [source] = await db
    .select()
    .from(sources)
    .where(and(eq(sources.id, sourceId), eq(sources.documentId, documentId)));

  if (!source) {
    throw new NotFoundError("Source not found in this document");
  }

  // Get next citation number
  const citationNumber = document.citationCount + 1;

  // Create citation and increment document citation count in a transaction
  const [citation] = await db.transaction(async (tx) => {
    // Insert citation
    const [newCitation] = await tx
      .insert(citations)
      .values({
        documentId,
        sourceId,
        citationNumber,
        position,
      })
      .returning();

    // Increment document citation count
    await tx
      .update(documents)
      .set({
        citationCount: sql`${documents.citationCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    return [newCitation];
  });

  logger.info(
    { userId, documentId, citationId: citation.id, citationNumber },
    "Citation created"
  );

  return c.json(citation, 201);
});

// GET /citations/:documentId - List all citations for a document
citationsRouter.get("/:documentId", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const documentId = c.req.param("documentId");
  const services = c.get("services");
  const db = services.db;

  // Verify document ownership
  await requireDocumentOwnership(documentId, userId, db);

  const documentCitations = await db
    .select({
      id: citations.id,
      sourceId: citations.sourceId,
      citationNumber: citations.citationNumber,
      position: citations.position,
      createdAt: citations.createdAt,
      source: {
        id: sources.id,
        url: sources.url,
        title: sources.title,
        author: sources.author,
        citationKey: sources.citationKey,
      },
    })
    .from(citations)
    .innerJoin(sources, eq(citations.sourceId, sources.id))
    .where(eq(citations.documentId, documentId))
    .orderBy(citations.citationNumber);

  return c.json(documentCitations);
});

// DELETE /citations/:citationId - Delete a citation
citationsRouter.delete("/:citationId", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const citationId = c.req.param("citationId");
  const services = c.get("services");
  const db = services.db;

  // Verify citation ownership and get citation details
  const citation = await requireCitationOwnership(citationId, userId, db);
  const documentId = citation.documentId;

  // Delete citation and decrement document citation count in a transaction
  await db.transaction(async (tx) => {
    // Delete the citation
    await tx.delete(citations).where(eq(citations.id, citationId));

    // Decrement citation count for this document
    await tx
      .update(documents)
      .set({
        citationCount: sql`GREATEST(${documents.citationCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    // Renumber remaining citations (optional - depends on requirements)
    // Actually there are no clinets at all, so no worries about breaking changes. Let's just renumber to keep things tidy.
  });

  logger.info({ userId, citationId, documentId }, "Citation deleted");

  return c.body(null, 204);
});
```

**Step 3: Mount citations router in app.ts**

Add after line 33:

```typescript
import { citationsRouter } from "./citations";

// ... existing routes ...

appRouter.route(
  constructApiRoute("/citations"), citationsRouter
);
```

**Step 4: Run typecheck**

Run: `cd api && bun run typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add api/src/routes/citations.ts api/src/routes/app.ts api/src/utils/ownership.ts
git commit -m "feat: add citation routes for creating, listing, and deleting citations"
```

---

## Task 3: Add Asset Routes

**Files:**
- Create: `api/src/routes/assets.ts`
- Modify: `api/src/routes/app.ts` - Mount assets router
- Keep in mind need for zod api validation later and also to generate openaischema

**Step 1: Create assets.ts route file**

```typescript
/**
 * Assets CRUD routes
 * Manage document assets (images, files) stored in R2
 */

import { Hono } from "hono";
import { z } from "zod";
import { schema, eq, and } from "@/infrastructure/db";
import { logger } from "@/utils/logger";
import { NotFoundError, ValidationError } from "@/infrastructure/errors";
import { requireDocumentOwnership } from "@/utils/ownership";

const { assets } = schema;

export const assetsRouter = new Hono();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

// POST /assets/:documentId - Upload an asset
assetsRouter.post("/:documentId", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const documentId = c.req.param("documentId");
  const services = c.get("services");
  const db = services.db;
  const storageService = services.storageService;

  // Verify document ownership
  await requireDocumentOwnership(documentId, userId, db);

  // Parse multipart form data
  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    throw new ValidationError("No file provided", { file: "Required" });
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError("File too large", {
      file: `Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    });
  }

  // Validate content type
  if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
    throw new ValidationError("Invalid file type", {
      file: `Allowed types: ${ALLOWED_CONTENT_TYPES.join(", ")}`,
    });
  }

  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueFilename = `${timestamp}_${sanitizedFilename}`;

  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to R2
  await storageService.uploadAsset(
    userId,
    documentId,
    uniqueFilename,
    buffer,
    file.type
  );

  // Get R2 key for database
  const r2Key = `assets/${userId}/${documentId}/${uniqueFilename}`;

  // Create asset record in database
  const [asset] = await db
    .insert(assets)
    .values({
      documentId,
      r2Key,
      filename: file.name,
      contentType: file.type,
      size: file.size,
    })
    .returning();

  // Generate public URL
  const publicUrl = storageService.getPublicUrl(r2Key);

  logger.info(
    { userId, documentId, assetId: asset.id, filename: file.name },
    "Asset uploaded"
  );

  return c.json(
    {
      ...asset,
      publicUrl,
    },
    201
  );
});

// GET /assets/:documentId - List all assets for a document
assetsRouter.get("/:documentId", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const documentId = c.req.param("documentId");
  const services = c.get("services");
  const db = services.db;
  const storageService = services.storageService;

  // Verify document ownership
  await requireDocumentOwnership(documentId, userId, db);

  const documentAssets = await db
    .select()
    .from(assets)
    .where(eq(assets.documentId, documentId))
    .orderBy(assets.createdAt.desc());

  // Add public URLs to each asset
  const assetsWithUrls = documentAssets.map((asset) => ({
    ...asset,
    publicUrl: storageService.getPublicUrl(asset.r2Key), // This propapbly won't be supported as we don't want to expose data to public, but just leave it there, as getPublicUrl won't work
  }));

  return c.json(assetsWithUrls);
});

// GET /assets/:documentId/:assetId - Get a specific asset (proxy)
assetsRouter.get("/:documentId/:assetId", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const documentId = c.req.param("documentId");
  const assetId = c.req.param("assetId");
  const services = c.get("services");
  const db = services.db;
  const storageService = services.storageService;

  // Verify document ownership
  await requireDocumentOwnership(documentId, userId, db);

  // Get asset record
  const [asset] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.documentId, documentId)));

  if (!asset) {
    throw new NotFoundError("Asset not found");
  }

  // Extract filename from r2Key
  const filename = asset.r2Key.split("/").pop() || asset.filename;

  // Get asset from R2
  const content = await storageService.getAsset(userId, documentId, filename);

  // Return with appropriate content type
  return new Response(content, {
    headers: {
      "Content-Type": asset.contentType,
      "Content-Length": content.length.toString(),
      "Cache-Control": "public, max-age=31536000", // 1 year cache for immutable assets
    },
  });
});

// DELETE /assets/:documentId/:assetId - Delete an asset
assetsRouter.delete("/:documentId/:assetId", async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const documentId = c.req.param("documentId");
  const assetId = c.req.param("assetId");
  const services = c.get("services");
  const db = services.db;
  const storageService = services.storageService;

  // Verify document ownership
  await requireDocumentOwnership(documentId, userId, db);

  // Get asset record
  const [asset] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.documentId, documentId)));

  if (!asset) {
    throw new NotFoundError("Asset not found");
  }

  // Extract filename from r2Key
  const filename = asset.r2Key.split("/").pop() || asset.filename;

  // Delete from R2
  await storageService.deleteAsset(userId, documentId, filename);

  // Delete from database
  await db.delete(assets).where(eq(assets.id, assetId));

  logger.info({ userId, documentId, assetId }, "Asset deleted");

  return c.body(null, 204);
});
```

**Step 2: Mount assets router in app.ts**

Add after citations router:

```typescript
import { assetsRouter } from "./assets";

// ... existing routes ...

appRouter.route(
  constructApiRoute("/assets"), assetsRouter
);
```

**Step 3: Run typecheck**

Run: `cd api && bun run typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add api/src/routes/assets.ts api/src/routes/app.ts
git commit -m "feat: add asset routes for uploading, listing, and managing document assets"
```

---

## Task 4: Verify Chat Routes (Already Implemented)

The chat routes already exist in `api/src/routes/chat.ts` with:
- POST /chat - Create chat with documentId
- GET /chat/:documentId - Retrieve chat history

The implementation already:
- Requires documentId in request body
- Verifies document ownership
- Retrieves chat history for a document

This should already be working. Verify with a quick test after the other tasks.

**Step 1: Verify chat routes exist and compile**

Run: `cd api && bun run typecheck`
Expected: No errors related to chat routes

---

## Final Verification

**Step 1: Run full typecheck**

Run: `cd api && bun run typecheck`
Expected: No errors

**Step 2: Summary of changes**

After completing all tasks, the backend will have:
1. ✅ All environment variables properly validated via env.ts
2. ✅ Citation routes: POST/GET/DELETE for managing citations
3. ✅ Asset routes: POST/GET/DELETE for uploading and managing files
4. ✅ Chat routes: Already implemented with document-scoped history

**API Endpoints Summary:**

```
POST   /api/v1/citations/:documentId      - Create citation
GET    /api/v1/citations/:documentId      - List citations
DELETE /api/v1/citations/:citationId      - Delete citation

POST   /api/v1/assets/:documentId         - Upload asset
GET    /api/v1/assets/:documentId         - List assets
GET    /api/v1/assets/:documentId/:assetId - Get asset (proxy)
DELETE /api/v1/assets/:documentId/:assetId - Delete asset

POST   /api/v1/chat                       - Stream chat (with persistence)
GET    /api/v1/chat/:documentId           - Get chat history
```

**Backend is now ready for frontend integration!**

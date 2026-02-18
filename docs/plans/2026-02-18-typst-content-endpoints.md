# Typst Content Endpoints Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 3 missing API endpoints to enable frontend Typst document editing and bibliography generation.

**Architecture:** Expose existing R2StorageService methods through OpenAPIHono routes with automatic validation. Bibliography endpoint queries document sources, generates BibTeX entries using existing utility, and caches result in R2.

**Tech Stack:** Hono + OpenAPI, Drizzle ORM, R2 Storage, Zod validation

---

## Task 1: Add Zod Schemas for New Endpoints

**Files:**
- Modify: `shared/src/api/documents.ts:1-23`

**Step 1: Add schemas for content and bibliography endpoints**

Add these schemas after the existing `updateDocumentBodySchema`:

```typescript
export const documentContentResponseSchema = z.object({
  content: z.string(),
});

export const updateDocumentContentBodySchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
});

export const bibliographyResponseSchema = z.object({
  bibliography: z.string(),
});
```

**Step 2: Verify TypeScript compilation**

Run: `cd shared && bun run typecheck`
Expected: No type errors

**Step 3: Commit**

```bash
git add shared/src/api/documents.ts
git commit -m "feat: add Zod schemas for Typst content and bibliography endpoints"
```

---

## Task 2: Write Failing Test for GET Content Endpoint

**Files:**
- Create: `api/tests/routes/documents-content.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { testClient } from "../helpers/test-client";
import { cleanDatabase, seedTestUser } from "../helpers/test-database-service";
import { db, schema } from "@/infrastructure/db";
import { serviceContainer } from "@/services/container";

describe("GET /api/v1/documents/:id/content", () => {
  const userId = "test-user-id";
  const mockToken = "mock-jwt-token";

  beforeEach(async () => {
    await cleanDatabase();
    await seedTestUser(userId, 1000);
  });

  it("should retrieve Typst content from R2", async () => {
    const documentId = crypto.randomUUID();
    const typstContent = "= My Document\\n\\nThis is content.";
    
    await db.insert(schema.documents).values({
      id: documentId,
      userId,
      title: "Test Doc",
      template: "default",
      typstKey: `documents/${userId}/${documentId}/main.typ`,
      citationFormat: "APA",
    });

    const storageService = serviceContainer.getStorageService();
    await storageService.uploadDocument(userId, documentId, typstContent);

    const response = await testClient.documents[":id"].content.$get(
      { param: { id: documentId } },
      { headers: { Authorization: `Bearer ${mockToken}` } }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.content).toBe(typstContent);
  });

  it("should return 404 if document not found in database", async () => {
    const fakeId = crypto.randomUUID();

    const response = await testClient.documents[":id"].content.$get(
      { param: { id: fakeId } },
      { headers: { Authorization: `Bearer ${mockToken}` } }
    );

    expect(response.status).toBe(404);
  });

  it("should return 404 if content not found in R2", async () => {
    const documentId = crypto.randomUUID();
    
    await db.insert(schema.documents).values({
      id: documentId,
      userId,
      title: "Test Doc",
      template: "default",
      typstKey: `documents/${userId}/${documentId}/main.typ`,
      citationFormat: "APA",
    });

    const response = await testClient.documents[":id"].content.$get(
      { param: { id: documentId } },
      { headers: { Authorization: `Bearer ${mockToken}` } }
    );

    expect(response.status).toBe(404);
  });

  it("should return 403 if user does not own document", async () => {
    const documentId = crypto.randomUUID();
    const otherUserId = "other-user-id";
    
    await seedTestUser(otherUserId, 1000);
    await db.insert(schema.documents).values({
      id: documentId,
      userId: otherUseritle: "Other User Doc",
      template: "default",
      typstKey: `documents/${otherUserId}/${documentId}/main.typ`,
      citationFormat: "APA",
    });

    const response = await testClient.documents[":id"].content.$get(
      { param: { id: documentId } },
      { headers: { Authorization: `Bearer ${mockToken}` } }
    );

    expect(response.status).toBe(403);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd api && bun run test -- --run documents-content`
Expected: FAIL with "route not found" or similar

**Step 3: Commit**

```bash
git add api/tests/routes/documents-content.test.ts
git commit -m "test: add failing tests for GET document content endpoint"
```

---

## Task 3: Implement GET Content Endpoint

**Files:**
- Modify: `api/src/routes/documents.ts:197`

**Step 1: Import new schema**

Update the import at line 7-11:

```typescript
import {
  createDocumentSchema,
  documentResponseSchema,
  updateDocumentBodySchema,
  documentContentResponseSchema,
} from "@shared/src";
```

**Step 2: Add GET content route definition**

Add after the `deleteDocumentRoute` (after line 196):

```typescript
const getDocumentContentRoute = createRoute({
  method: "get",
  path: "/{id}/content",
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: documentContentResponseSchema,
        },
      },
      description: "Document Typst content retrieved successfully",
    },
  },
  tags: ["Documents"],
});

documentsRouter.openapi(getDocumentContentRoute, async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const { id: documentId } = c.req.valid("param");
 ces = c.get("services");
  const db = services.db;
  const storageService = services.storageService;

  await requireDocumentOwnership(documentId, userId, db);

  const content = await storageService.getDocument(userId, documentId);

  logger.info({ userId, documentId }, "Document content retrieved");

  return c.json({ content });
});
```

**Step 3: Run test to verify it passes**

Run: `cd api && bun run test -- --run documents-content`
Expected: All tests PASS

**Step 4: Verify TypeScript compilation**

Run: `cd api && bun run typecheck`
Expected: No type errors

**Step 5: Commit**

```bash
git add api/src/routes/documentst commit -m "feat: implement GET /api/v1/documents/:id/content endpoint"
```

---

## Task 4: Write Failing Test for PUT Content Endpoint

**Files:**
- Modify: `api/tests/routes/documents-content.test.ts:1`

**Step 1: Add PUT content tests**

Add after the GET tests in the same file:

```typescript
describe("PUT /api/v1/documents/:id/content", () => {
  const userId = "test-user-id";
  const mockToken = "mock-jwt-token";

  beforeEach(async () => {
    await cleanDatabase();
    await seedTestUser(userId, 1000);
  });

  it("should update Typst content in R2", async () => {
    const documentId = crypto.randomUUID();
    const initialContent = "= Initial\\n\\nOld content.";
    const updatedContent = "= Updated\\n\\nNew content.";
    
    await db.insert(schema.documents).values({
      id: documentId,
      userId,
      title: "Test Doc",
      template: "default",
      typstKey: `documents/${userId}/${documentId}/main.typ`,
      citationFormat: "APA",
    });

    const storageService = serviceContainer.getStorageService();
    await storageService.uploadDocument(userId, documentId, initialContent);

    const response = await testClient.documents[":id"].content.$put(
      { param: { id: documentId }, json: { content: updatedContent } },
      { headers: { Authorization: `Bearer ${mockToken}` } }
    );

    expect(response.status).toBe(200);

    const retrievedContent = await storageService.getDocument(userId, documentId);
    expect(retrievedContent).toBe(updatedContent);
  });

  it("should return 400 if content is empty", async () => {
    const documentId = crypto.randomUUID();
    
    await db.insert(schema.documents).values({
      id: documentId,
      userId,
      title: "Test Doc",
      template: "default",
      typstKey: `doc${userId}/${documentId}/main.typ`,
      citationFormat: "APA",
    });

    const response = await testClient.documents[":id"].content.$put(
      { param: { id: documentId }, json: { content: "" } },
      { headers: { Authorization: `Bearer ${mockToken}` } }
    );

    expect(response.status).toBe(400);
  });

  it("should return 404 if document not found", async () => {
    const fakeId = crypto.randomUUID();

    const response = await testClient.documents[":id"].content.$put(
      { param: { id: fakeId }, json: { content: "test" } },
      { headers: { Authorization: `Bearer ${mockToken}` } }
    );

    expect(response.stas).toBe(404);
  });

  it("should return 403 if user does not own document", async () => {
    const documentId = crypto.randomUUID();
    const otherUserId = "other-user-id";
    
    await seedTestUser(otherUserId, 1000);
    await db.insert(schema.documents).values({
      id: documentId,
      userId: otherUserId,
      title: "Other User Doc",
      template: "default",
      typstKey: `documents/${otherUserId}/${documentId}/main.typ`,
      citationFormat: "APA",
    });

    const response = await testClient.documents[":id"].content.$put(
      { param: { id: documentId }, json: { content: "test" } },
      { headers: { Authorization: `Bearer ${mockToken}` } }
    );

    expect(response.status).toBe(403);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd api && bun run test -- --run documents-content`
Expected: FAIL with "route not found" or similar

**Step 3: Commit**

```bash
git add api/tests/routes/documents-content.test.ts
git commit -m "test: add failing tests for PUT document content endpoint"
```

---

## Task 5: Implement PUT Content Endpoint

**Files:**
- Modify: `api/src/routes/documents.ts:1`

**Step 1: Import update schema**

Update the import to include `updateDocumentContentBodySchema`:

```typescript
import {
  createDocumentSchema,
  documentResponseSchema,
  updateDocumentBodySchema,
  documentContentResponseSchema,
  updateDocumentContentBodySchema,
} from "@shared/src";
```

**Step 2: Add PUT content route definition**

Add after the GET content route:

```typescript
const updateDocumentContentRoute = createRoute({
  method: "put",
  path: "/{id}/content",
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: updateDocumentContentBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
      description: "Document content updated successfully",
    },
  },
  tags: ["Documents"],
});

documentsRouter.openapi(updateDocumentContentRoute, async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const { id: documentId } = c.req.valid("param");
  const { content } = c.req.valid("json");
  const services = c.get("services");
  const db = services.db;
  const storageService = services.storageService;

  await requireDocumentOwnership(documentId, userId, db);

  await storageService.uploadDocument(userId, documentId, content);

  logger.info({ userId, documentId, contentLength: content.length }, "Document content updated");

  return c.json({ success: true });
});
```

**Step 3: Run test to verify it passes**

Run: `cd api && bun run test -- --run documents-content`
Expected: All tests PASS

**Step 4: Verify TypeScript compilation**

Run: `cd api && bun run typecheck`
Expected: No type errors

**Step 5: Commit**

```bash
git add api/src/routes/documents.ts
git commit -m "feat: implement PUT /api/v1/documents/:id/dpoint"
```

---

## Task 6: Write Failing Test for GET Bibliography Endpoint

**Files:**
- Create: `api/tests/routes/documents-bibliography.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { testClient } from "../helpers/test-client";
import { cleanDatabase, seedTestUser } from "../helpers/test-database-service";
import { db, schema } from "@/infrastructure/db";

describe("GET /api/v1/documents/:id/bibliography", () => {
  const userId = "test-user-id";
  const mockToken = "mock-jwt-token";

  beforeEach(async () => {
  leanDatabase();
    await seedTestUser(userId, 1000);
  });

  it("should generate BibTeX bibliography from document sources", async () => {
    const documentId = crypto.randomUUID();
    
    await db.insert(schema.documents).values({
      id: documentId,
      userId,
      title: "Test Doc",
      template: "default",
      typstKey: `documents/${userId}/${documentId}/main.typ`,
      citationFormat: "APA",
    });

    await db.insert(schema.sources).values([
      {
        id: crypto.randomUUID(),
        documentId,
        url: "https://example.com/paper1",
        citationKey: "smith2023",
        title: "Machine Learning Basics",
        author: "John Smith",
        publicationDate: new Date("2023-05-15"),
        sourceType: "journal",
      },
      {
        id: crypto.randomUUID(),
        documentId,
        url: "https://example.com/paper2",
        citationKey: "doe2024",
        title: "Advanced AI Techniques",
        author: "Jane Doe",
        publicationDate: new Date("2024-01-10"),
        sourceType: "book",
      },
    ]);

    const response = await testClient.documents[":id"].bibliography.$get(
      { param: { id: documentId } },
      { headers: { Authorization: `Bearer ${mockToken}` } }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.bibliography).toContain("@article{smith2023");
    expect(data.bibliography).toContain("title = {Machine Learning Basics}");
    expect(data.bibliography).toContain("author = {John Smith}");
    expect(data.bibliography).toContain("year = {2023}");
    expect(data.bibliography).toContain("@book{doe2024");
    expect(data.bibliography).toContain("title = {Advanced AI Techniques}");
  });

  it("should return empty bibliography if no sources", async () => {
    const documentId = crypto.randomUUID();
    
    await db.insert(schema.documents).values({
      id: documentId,
      userId,
      title: "Test Doc",
      template: "default",
      typstKey: `documents/${userId}/${documentId}/main.typ`,
      citationFormat: "APA",
    });

    const response = await testClient.documents[":id"].bibliography.$get(
      { param: { id: documentId } },
      { headers: { Authorization: `Bearer ${mockToken}` } }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.bibliography).toBe("");
  });

  it("should return 404 if document not found", async () => {
    const fakeId = crypto.randomUUID();

    const response = await testClient.documents[":id"].bibliography.$get(
      { param: { id: fakeId } },
      { headers: { Authorization: `Bearer ${mockToken}` } }
    );

    expect(response.status).toBe(404);
  });

  it("should return 403 if user does not own document", async () => {
    const documentId = crypto.randomUUID();
    const otherUserId = "other-user-id";
    
    await seedTestUser(otherUserId, 1000);
    await db.insert(schema.documents).values({
      id: documentId,
      userId: otherUserId,
      title: "Other User Doc",
      template: "default",
      typstKey: `documents/${otherUserId}/${documentId}/main.typ`,
      citationFormat: "APA",
    });

    const response = await testClient.documents[":id"].bibliography.$get(
      { param: { id: documentId } },
      { headers: { Authorization: `Bearer ${mockToken}` } }
    );

    expect(response.status).toBe(403);
  });

  it("should cache bibliography in R2 for future requests", async () => {
    const documentId = crypto.randomUUID();
    
    await db.insert(schema.doclues({
      id: documentId,
      userId,
      title: "Test Doc",
      template: "default",
      typstKey: `documents/${userId}/${documentId}/main.typ`,
      citationFormat: "APA",
    });

    await db.insert(schema.sources).values({
      id: crypto.randomUUID(),
      documentId,
      url: "https://example.com/paper",
      citationKey: "test2023",
      title: "Test Paper",
      author: "Test Author",
      sourceType: "journal",
    });

    const response1 = await testClient.documents[":id"].bibliography.$get(
      { param: { id: documentId } },
      { headers: { Authorization: `Bearer ${mockToken}` } }
    );

    expect(response1.status).toBe(200);
    const data1 = await response1.json();

    const response2 = await testClient.documents[":id"].bibliography.$get(
      { param: { id: documentId } },
      { headers: { Authorization: `Bearer ${mockToken}` } }
    );

    expect(response2.status).toBe(200);
    const data2 = await response2.json();
    
    expect(data2.bibliography).toBe(data1.bibliography);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd api && bun run test -- --run documents-bibliography`
Expected: FAIL with "route not found" or similar

**Step 3: Commit**

```bash
git add api/tests/routes/documents-bibliography.test.ts
git commit -m "test: add failing tests for GET bibliography endpoint"
```

---

## Task 7: Implement GET Bibliography Endpoint

**Files:**
- Modify: `api/src/routes/documents.ts:1`

**Step 1: Import bibliography utilities**

Add imports at the top:

```typescript
import { generateBibTex } from "@/utils/bibtex";
```

Update schema import:

```typescript
import {
  createDocumentSchema,
  documentResponseSchema,
  updateDocumentBodySchema,
  documentContentResponseSchema,
  updateDocumentContentBodySchema,
  bibliographyResponseSchema,
} from "@shared/src";
```

**Step 2: Add GET bibliography route definition**

Add after the PUT content route:

```typescript
const getDocumentBibliographyRoute = createRoute({
  method: "get",
  path: "/{id}/bibliography",
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: bibliographyResponseSchema,
        },
      },
      description: "Document bibliography rd successfully",
    },
  },
  tags: ["Documents"],
});

documentsRouter.openapi(getDocumentBibliographyRoute, async (c) => {
  const auth = c.get("auth");
  const userId = auth.userId;
  const { id: documentId } = c.req.valid("param");
  const services = c.get("services");
  const db = services.db;
  const storageService = services.storageService;

  await requireDocumentOwnership(documentId, userId, db);

  try {
    const cachedBib = await storageService.getBibliography(userId, documentId);
    logger.info({ userId, documentId }, "Bibliography retrieved from cache");
    return c.json({ bibliography: cachedBib });
  } catch (error) {
    logger.debug({ userId, documentId }, "Bibliography not cached, generating fresh");
  }

  const documentSources = await db
    .select()
    .from(schema.sources)
    .where(eq(schema.sources.documentId, documentId));

  const bibEntries = documentSources.map((source) => generateBibTex(source));
  const bibliography = bibEntries.join("\\n\\n");

  if (bibliography) {
    try {
      await storageService.uploadBibliography(userId, documentId, bibliography);
      logger.info({ userId, documentId, sourceCount: documentSources.length }, "Bibliography generated and cached");
    } catch (error) {
      logger.error({ error, userId, documentId }, "Failed to cache bibliography");
    }
  }

  return c.json({ bibliography });
});
```

**Step 3: Run test to verify it passes**

Run: `cd api && bun run test -- --run documents-bibliography`
Expected: All tests PASS

**Step 4: Verify TypeScript compilation**

Run: `cd api && bun run typecheck`
Expected: No type errors

**Step 5: Commit**

```bash
git add api/src/routes/documents.ts
git commit -m "feat: implement GET /api/v1/documents/:id/bibliography endpoint"
```

---

## Task 8: Run Full Test Suite

**Files:**
- None (verification only)

**Step 1: Run all tests**

Run: `cd api && bun run test -- --run`
Expected: All tests PASS (including new tests)

**Step 2: Verify build**

Run: `cd api && bun run build`
Expected: Build succeeds with no errors

**Step 3: Verify type checking**

Run: `cd api && bun run typecheck`
Expected: No type errors

---

## Task 9: Update OpenAPI Documentation

**Files:**
- None (automatic via OpenAPIHono)

**Step 1: Start API server**

Run: `cd api && bun run dev`
Expected: Server starts on port 3001

**Step 2: Verify OpenAPI spec includes new endpoints**

Open: `http://localhost:3001/api/v1/doc`
Expected: JSON spec includes all 3 new endpoints

**Step 3: Verify Scalar UI shows new endpoints**

Open: `http://localhost:3001/reference`
Expected: Interactive docs show all 3 new endpoints with schemas

**Step 4: Stop server**

Press: `Ctrl+C`

---

## Task 10: Final Commit and Push

**Files:**
- None (git operations only)

**Step 1: Verify git status**

Run: `git status`
Expected: All changes committed, working tree clean

**Step 2: Push to remote**

Run: `git push origin main`
Expected: Push succeeds

**Step 3: Verify completion**

All 3 endpoints implemented:
- GET /api/v1/documents/{id}/content - Retrieve Typst file from R2
- PUT /api/v1/documents/{id}/content - Update Typst file in R2
- GET /api/v1/documents/{id}/bibliography - Generate BibTeX from sources

Backend is now 100% compliant with Typst requirements.

---

## Notes

**Testing Strategy:**
- Integration tests with real TestContainers database
- Real R2 storage operations (mocked S3 client in test environment)
- Test ownership validation, 404 handling, empty states
- Verify caching behavior for bibliography

**Error Handling:**
- Use requireDocumentOwnership for authorization
- Throw NotFoundError from infrastructure/errors
- Use structured logger from utils/logger
- R2 errors handled by R2StorageService with retry logic

**Performance:**
- Bibliography caching in R2 reduces database queries
- Cache invalidation handled by frontend (regenerate on source changes)
- Existing retry logic in R2StorageService handles transient failures

**Security:**
- All routes protected by authMiddleware
- Document ownership verified before any operation
- Zod validation prevents empty content uploads
- No direct file path manipulation (R2 keys generated by service)

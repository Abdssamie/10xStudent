---
name: hono-api-patterns
description: Use when building Hono API applications. Covers middleware patterns, route organization, context management, validation with Zod, error handling, and TypeScript type safety.
---

# Hono API Patterns

## Overview

This skill provides patterns for building type-safe, well-organized Hono API applications. Hono is a lightweight web framework built on Web Standards that works across multiple JavaScript runtimes.

**Use this skill when:**

- Setting up Hono API routes and middleware
- Organizing route handlers and middleware
- Implementing validation with Zod
- Managing context variables and type safety
- Building RESTful APIs with Hono

## Quick Start

### Basic Hono Application

```typescript
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.text("Hello Hono!"));

export default app;
```

### With TypeScript Types

```typescript
import { Hono } from "hono";

type Bindings = {
  DATABASE_URL: string;
};

type Variables = {
  userId: string;
  logger: Logger;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
```

## Core Patterns

### Pattern 1: Route Organization

Organize routes by resource:

```typescript
// routes/documents.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const documents = new Hono();

// List documents
documents.get("/", async (c) => {
  const userId = c.get("userId");
  const docs = await db.query.documents.findMany({
    where: eq(documents.userId, userId),
  });
  return c.json(docs);
});

// Get single document
documents.get("/:id", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");

  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, id), eq(documents.userId, userId)),
  });

  if (!doc) {
    return c.json({ error: "Document not found" }, 404);
  }

  return c.json(doc);
});

// Create document
const createDocumentSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().optional(),
});

documents.post("/", zValidator("json", createDocumentSchema), async (c) => {
  const userId = c.get("userId");
  const body = c.req.valid("json");

  const [doc] = await db
    .insert(documents)
    .values({
      userId,
      title: body.title,
      content: body.content,
    })
    .returning();

  return c.json(doc, 201);
});

export default documents;
```

### Pattern 2: Middleware with createMiddleware

Create reusable middleware with type safety:

```typescript
import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';

// Auth middleware
export const authMiddleware = createMiddleware<{
  Variables: {
    userId: string;
    user: User;
  };
}>(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const userId = await verifyToken(token);
  const user = await getUserById(userId);

  c.set('userId', userId);
  c.set('user', user);

  await next();
});

// Usage
app.use('/api/*', authMiddleware);

app.get('/api/profile (c) => {
  const user = c.get('user'); // Type-safe!
  return c.json(user);
});
```

### Pattern 3: Context Variables (c.set/c.get)

Share data between middleware and handlers:

```typescript
// Set in middleware
app.use(async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set("requestId", requestId);
  await next();
});

// Get in handler
app.get("/api/data", (c) => {
  const requestId = c.get("requestId");
  return c.json({ requestId });
});

// Type-safe context
type Variables = {
  requestId: string;
  userId: string;
  logger: Logger;
};

const app = new Hono<{ Variables: Variables }>();
```

### Pattern 4: Validation with Zod

Validate request data with Zod:

```typescript
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

// Query parameters
const querySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('10'),
});

app.get(
  '/api/documents',
  zValidator('query', querySchema),
  async (c) => {
    const { page, limit } = c.req.valid('query');
    // page and limit are numbers
    return c.json({ page, limit });
  }
);

// JSON body
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  age: z.number().int().min(18).optional(),
});

app.post(
  '/api/users',
  zValidator('json', createUserSchema),
  async (c) => {
    const body = c.req.valid('json');
    // body is type-safe
    return c.json(body, 201);
  }
);

// Path parameters
const paramSchema = z.object({
  id: z.string().uuid(),
});

app.get(
  '/api/documents/:id',
  zValidator('param', paramSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    // id is validated as UUID
    return c.json({ id  }
);

// Headers
const headerSchema = z.object({
  'x-api-key': z.string().min(1),
});

app.get(
  '/api/protected',
  zValidator('header', headerSchema),
  async (c) => {
    const headers = c.req.valid('header');
    return c.json({ apiKey: headers['x-api-key'] });
  }
);
```

### Pattern 5: Error Handling

Global error handler:

```typescript
import { HTTPException } from 'hono/http-exception';

app.onError((err, c) => {
  const logger = c.get('logger');

  if (err instanceof HTTPException) {
    logger.warn({
      status: err.st  message: err.message,
    }, 'HTTP exception');

    return c.json({
      error: err.message,
      requestId: c.get('requestId'),
    }, err.status);
  }

  logger.error({ err }, 'Unhandled error');

  return c.json({
    error: 'Internal Server Error',
    requestId: c.get('requestId'),
  }, 500);
});

// Throw HTTP exceptions
app.get('/api/documents/:id', async (c) => {
  const doc = await findDocument(id);

  if (!doc) {
    throw new HTTPException(404, { message: 'Document not found' });
  }

  return c.json(doc);
});
```

### Pattern 6: Nested Routes

Organize routes hically:

```typescript
// Main app
const app = new Hono();

// API routes
const api = new Hono();

// Documents routes
const documents = new Hono();
documents.get("/", listDocuments);
documents.post("/", createDocument);
documents.get("/:id", getDocument);
documents.patch("/:id", updateDocument);
documents.delete("/:id", deleteDocument);

// Sources routes
const sources = new Hono();
sources.get("/", listSources);
sources.post("/", createSource);

// Mount routes
api.route("/documents", documents);
api.route("/sources", sources);
app.route("/api", api);

// Results in:
// GET  /api/documents
// POST /api/documents
// GET  /api/documents/:id
// GET  /api/sources
// POST /api/sources
```

### Pattern 7: Middleware Execution Order

Middleware executes in registration order:

```typescript
app.use(async (c, next) => {
  console.log("1: before");
  await next();
  console.log("1: after");
});

app.use(async (c, next) => {
  console.log("2: before");
  await next();
  console.log("2: after");
});

app.get("/", (c) => {
  console.log("handler");
  return c.text("Hello");
});

// Output:
// 1: before
// 2: before
// handler
// 2: after
// 1:
```

### Pattern 8: Conditional Middleware

Apply middleware to specific routes:

```typescript
// All routes under /api
app.use("/api/*", authMiddleware);

// Specific HTTP method and path
app.post("/api/documents/*", rateLimitMiddleware);

// Multiple middleware
app.use("/api/admin/*", authMiddleware, adminMiddleware);

// Conditional in middleware
const optionalAuthMiddleware = createMiddleware(async (c, next) => {
  const token = c.req.header("Authorization");

  if (token) {
    const userId = await verifyToken(token);
    c.set("userId", userId);
  }

  await next();
});
```

## Common Patterns for Spec 0

### Credit Deduction Endpoint

```typescript
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const deductCreditsSchema = z.object({
  amount: z.number().int().positive(),
  operation: z.enum(["llm_request", "document_generation", "source_embedding"]),
});

app.post(
  "/api/credits/deduct",
  authMiddleware,
  zValidator("json", deductCreditsSchema),
  async (c) => {
    const userId = c.get("userId");
    const logger = c.get("logger");
    const { amount, operation } = c.req.valid("json");

    logger.info({ userId, amount, operation }, "Deducting credits");

    try {
      const result = await deductCredits(userId, amount, operation);

      return c.json({
        success: true,
        remainingCredits: result.remainingCredits,
      });
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        throw new HTTPException(402, {
          message: "Insufficient credits",
        });
      }
      throw error;
    }
  },
);
```

### Streaming Response (for LLM)

```typescript
app.post("/api/chat", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const { prompt } = await c.req.json();

  const stream = await generateChatResponse(prompt, {
    onFinish: async (usage) => {
      await deductCredits(
        userId,
        Math.ceil(usage.totalTokens / 1000),
        "llm_request",
      );
    },
  });

  return c.body(stream);
});
```

### Pagination Pattern

```typescript
const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('20'),
});

app.get(
  '/api/documents',
  authMiddleware,
  zValidator('query', paginationSchema),
  async (c) => {
    const userId = c.get('userId');
    const { page, limit } = c.req.valid('query');
    const offset = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      db.query.documents.findMany({
        where: eq(documents.userId, userId),
        limit,
        offset,
        orderBy: desc(documents.updatedAt),
      }),
      db.select({ count: count() })
        .from(documents)
        .where(eq(documents.userId, userId)),
    ]);

    return c.json({
      data: documents,
      pagination: {
        page,
        limit,
        total: total[0].co        totalPages: Math.ceil(total[0].cit),
      },
    });
  }
);
```

## Best Practices

1. **Use TypeScript generics** - Define `Bindings` and `Variables` types for type safety
2. **Validate all inputs** - Use Zod validators for query, body, params, headers
3. **Use createMiddleware** - For reusable middleware with proper types
4. **Organize by resource** - Group related routes in separate files
5. **Handle errors globally** - Use `app.onError()` for consistent error responses
6. **Use HTTPException** - For throwing HTTP errors with proper status codes
7. **Leverage context** - Use `c.set()` and `c.get()` to share data between middleware
8. **Return early** - Return responses directly from middleware when needed

## Common Mistakes

### ❌ Not Using Validators

```typescript
// Bad - no validation
app.post("/api/users", async (c) => {
  const body = await c.req.json();
  // body is any, no validation
});
```

### ✅ Using Validators

```typescript
// Good - validated and type-safe
app.post("/api/users", zValidator("json", createUserSchema), async (c) => {
  const body = c.req.valid("json");
  // body is type-safe
});
```

### ❌ Forgetting await next()

```typescript
// Bad - breaks middleware chain
app.use(async (c, next) => {
  console.log("before");
  next(); // Missing await!
  console.log("after"); // Runs immediately
});
```

### ✅ Awaiting next()

```typescript
// Good - proper middleware chain
app.use(async (c, next) => {
  console.log("before");
  await next();
  console.log("after"); // Runs after handler
});
```

### ❌ Not Typing Context

```typescript
// Bad - no type safety
const app = new Hono();
c.get("userId"); // any type
```

### ✅ Typing Context

```typescript
// Good - type-safe context
type Variables = { userId: string };
const app = new Hono<{ Variables: Variables }>();
c.get("userId"); // string type
```

## Related Skills

- **pino-hono** - For structured logging in Hono applications
- **tanstack-ai** - For LLM integration with Hono endpoints

## Quick Reference

```typescript
// Basic route
app.get("/path", (c) => c.json({ data }));

// With validation
app.post("/path", zValidator("json", schema), (c) => {
  const body = c.req.valid("json");
});

// Middleware
app.use(middleware);
app.use("/path/*", middleware);

// Context
c.set("key", value);
const value = c.get("key");
c.var.key; // Alternative access

// Request
c.req.param("id");
c.req.query("page");
c.req.header("Authorization");
await c.req;
// Response
c.json(data);
c.text("text");
c.html("<html>");
c.redirect("/path");
c.notFound();

// Error handling
throw new HTTPException(404, { message: "Not found" });

// Nested routes
app.route("/api", apiRoutes);
```

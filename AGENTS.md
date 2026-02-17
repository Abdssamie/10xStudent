# Agent Instructions for 10xStudent

## Project Overview

AI-powered research platform: Next.js 16 + Hono API + Bun + Drizzle ORM + PostgreSQL (pgvector) + Redis + Clerk Auth

**Structure:** `web/` (Next.js), `api/` (Hono), `shared/` (Zod schemas)
**Path Aliases:** API: `@/*` → `./src/*`, `@shared` → `../shared` | Web: `@/*` → `./src/*`

---

## Commands

**Package Manager:** Always use `bun` (never npm/yarn/pnpm)

```bash
# Web (Next.js on port 3000)
cd web && bun run dev
bun run build && bun run lint && bun run check-types

# API (Hono on port 3001)
cd api && bun run dev
bun run build && bun run typecheck
bun run test -- --run                    # All tests (starts TestContainers)
bun run test -- --run credit-manager     # Single test by pattern match

# Database (from api/)
bun run db:generate && bun run db:push   # Generate + sync schema (dev)
bun run db:studio                        # Open Drizzle Studio

# Docker
docker compose up -d                     # Start PostgreSQL (5440) + Redis (6380)
```

---

## Code Style

### Import Order (Strict)
```typescript
// 1. External packages (alphabetical)
import { Hono } from "hono";
import { z } from "zod";

// 2. Shared modules
import { Document } from "@shared";

// 3. Internal modules (alphabetical)
import { db, schema } from "@/database";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";
import { NotFoundError } from "@/errors";

// 4. Relative imports
import { authMiddleware } from "./middleware/auth";
```

### TypeScript Standards
- `strict: true`, `noUncheckedIndexedAccess: true` enabled
- Never use `any` - use `unknown` or proper types
- Always explicit return types for functions
- Array access requires null checks: `arr[0]` returns `T | undefined`

### Naming Conventions
- Files: `kebab-case.ts` | Components: `PascalCase.tsx`
- Functions/variables: `camelCase()` | Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

---

## Critical API Patterns

### Environment Variables
**CRITICAL:** Never use `process.env` directly. Always import from `@/config/env`:
```typescript
import { env } from "@/config/env";  // ✅ Validated with Zod
const key = env.GOOGLE_API_KEY;
```

### Logging
**CRITICAL:** Never use `console.*`. Always use structured logger:
```typescript
import { logger } from "@/utils/logger";
logger.info({ userId, documentId }, "Document created");
logger.error({ error, url }, "External API failed");
```

### Error Handling
**CRITICAL:** Always throw custom errors from `@/errors`, never generic `Error` or direct JSON:
```typescript
import { NotFoundError, ValidationError, InsufficientCreditsError } from "@/errors";

if (!user) throw new NotFoundError("User not found");
if (user.credits < cost) throw new InsufficientCreditsError("Insufficient credits", { available: user.credits });

// ❌ NEVER: return c.json({ error: "Not found" }, 404);
// ❌ NEVER: throw new Error("User not found");
```

**Available Errors:** `NotFoundError` (404), `ValidationError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `InsufficientCreditsError` (402), `ConflictError` (409), `TooManyRequestsError` (429), `AppError` (custom)

---

## Common Patterns

### API Route (Hono)
```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { db, schema } from "@/database";
import { authMiddleware } from "@/middleware/auth";
import { NotFoundError } from "@/errors";
import { logger } from "@/utils/logger";

export const router = new Hono();

router.post("/", authMiddleware, zValidator("json", z.object({ title: z.string().min(1) })), async (c) => {
  const { userId } = c.get("auth");
  const data = c.req.valid("json");
  
  const [result] = await db.insert(schema.documents).values({ ...data, userId }).returning();
  if (!result) throw new NotFoundError("Failed to create document");
  
  logger.info({ userId, documentId: result.id }, "Document created");
  return c.json(result, 201);
});
```

### Database Query
```typescript
import { db, schema, eq, and } from "@/database";
import { NotFoundError } from "@/errors";

const documents = await db
  .select()
  .from(schema.documents)
  .where(and(eq(schema.documents.userId, userId), eq(schema.documents.id, documentId)));

const document = documents[0]; // Type: Document | undefined
if (!document) throw new NotFoundError("Document not found");
```

---

## Testing

### Integration Test Pattern
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { cleanDatabase, seedTestUser } from "../helpers/test-database-service";

describe("Feature Name", () => {
  beforeEach(async () => {
    await cleanDatabase();
    await seedTestUser("test-user-id", 1000);
  });

  it("should do something specific", async () => {
    const result = await functionUnderTest(input);
    expect(result).toBe(expected);
  });
});
```

### Running Tests
- All tests: `bun run test -- --run` (starts TestContainers automatically)
- Single test: `bun run test -- --run credit-manager` (pattern match)
- Docker must be running for TestCers
- Use real database, mock only external APIs

---

## Critical Rules

1. **Package Manager:** Always `bun`, never npm/yarn/pnpm
2. **Environment (API):** Import from `@/config/env`, never `process.env`
3. **Logging (API):** Import from `@/utils/logger`, never `console.*`
4. **Errors (API):** Throw from `@/errors`, never generic `Error` or direct JSON
5. **Types:** Strict mode, no `any`, explicit return types
6. **Imports:** Follow order (external → shared → internal → relative)
7. **Auth:** Use `c.get('auth')` in protected routes
8. **Database:** Drizzle ORM only, never raw SQL without parameterization
9. **Validation:** Zod schemas for all input
10. **Array Access:** Always check for undefined: `arr[0]` returns `T | undefined`

---

## Authentication (Clerk)

**Web:** `@clerk/nextjs`, `clerkMiddleware()` in middleware, `<ClerkProvider>` in layout
**API:** `@clerk/clerk-sdk-node`, JWT verification in `src/middleware/auth.ts`
**Flow:** Frontend → `Authorization: Bearer <token>` → API verifies → `c.get('auth').userId`

```typescript
router.post("/", authMiddleware, async (c) => {
  const { userId } = c.get("auth");
  // Use userId for authorization
});
```

---

## Troubleshooting

- **Type errors:** Run `bun run typecheck`, check `@/env.ts`
- **Build fails:** `rm -rf .next && bun install`
- **Auth issues:** Verify Clerk keys in `.env`, check CORS
- **Database:** `docker compose up -d`, verify `DATABASE_URL` in `api/.env`
- **Tests failing:** Ensure Docker is running, TestContainers pulls images on first run (~5-10s)

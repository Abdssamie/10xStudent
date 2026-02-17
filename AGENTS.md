# Agent Instructions for 10xStudent

## Project Overview

AI-powered research platform: Next.js 16 + Hono API + Bun + Drizzle ORM + PostgreSQL (pgvector) + Redis + Clerk Auth

**Structure:** `web/` (Next.js), `api/` (Hono), `shared/` (Zod schemas), `docker-compose.yml` (services)
**Path Aliases:** API: `@/*` → `./src/*`, `@shared` → `../shared` | Web: `@/*` → `./src/*`

---

## Commands

**Package Manager:** Always use `bun` (never npm/yarn/pnpm)

```bash
# Web (Next.js on port 3000)
cd web && bun install && bun run dev
bun run build                    # Production build
bun run lint                     # ESLint with --max-warnings 0
bun run check-types              # TypeScript type checking

# API (Hono on port 3001)
cd api && bun install && bun run dev
bun run build                    # Production build
bun run typecheck                # TypeScript type checking
bun run test -- --run            # All tests (non-interactive, starts TestContainers)
bun run test -- --run bibtex     # Single test by pattern match (e.g., "bibtex", "credit-manager")
bun run test:integration         # Integration tests only

# Database (from api/)
bun run db:generate              # Generate migrations from schema
bun run db:migrate               # Apply migrations (production)
bun run db:push                  # Direct sync (dev only, no migration files)
bun run db:studio                # Open Drizzle Studio

# Docker
docker compose up -d             # Start PostgreSQL (5440) + Redis (6380)
docker compose down              # Stop all services
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

// 3. Internal modules (alphabetical by category)
import { db, schema } from "@/database";
import { env } from "@/config/env";

// 4. Relative imports
import { authMiddleware } from "./middleware/auth";
```

### TypeScript Standards
- `strict: true`, `noUncheckedIndexedAccess: true` enabled
- Never use `any` - use `unknown` or proper types
- Always explicit return types for functions
- Use `type` for unions/primitives, `interface` for objects
- Array access requires null checks: `arr[0]` returns `T | undefined`

```typescript
// ✅ Good
function getUser(id: string): Promise<User | null> {
  const users = await db.query.users.findMany();
  const user = users[0]; // Type: User | undefined
  return user ?? null;
}

// ❌ Bad
function getUser(id: string) {
  const users = await db.query.users.findMany();
  return users[0]; // No explicit return type
}
```

### Logging (Structured with Pino)
**CRITICAL:** Never use `console.log/error/warn`. Always import structured logger from `@/utils/logger`.

```typescript
import { logger } from "@/utils/logger";

// ✅ Good - Structured logging with context
logger.info({ userId, documentId }, "Document created successfully");
logger.error({ error, url, statusCode }, "External API failed");
logger.warn({ credits: user.credits }, "Low credit balance");

// ❌ Bad - Don't use console
console.log("Document created"); // Wrong!
console.error("API failed:", error); // Wrong!
```

**Log Levels:** `debug`, `info`, `warn`, `error`, `fatal`
**Context:** Always include relevant IDs, operation names, and error details
**Production:** Logs are JSON format, development uses pretty-printed output

### Environment Variables (API Only)
**CRITICAL:** Never use `process.env` directly. Always import from `@/config/env`:

```typescript
// ✅ Good
import { env } from "@/config/env";
const key = env.GOOGLE_API_KEY;

// ❌ Bad
const key = process.env.GOOGLE_API_KEY;
```

**Reason:** `@/config/env` validates all environment variables at startup using Zod schemas.

### Naming Conventions
- Files: `kebab-case.ts`
- Components: `PascalCase.tsx`
- Functions/variables: `camelCase()`
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase`
- Private functions: `_camelCase()` (prefix with underscore)

### Error Handling (Unified System)
**CRITICAL:** Always use custom error classes from `@/errors`, never throw generic `Error` or return JSON directly.

```typescript
import { NotFoundError, ValidationError, UnauthorizedError, InsufficientCreditsError } from "@/errors";

// ✅ Good - Throw custom errors (middleware catches them)
if (!user) {
  throw new NotFoundError("User not found");
}

if (user.credits < cost) {
  throw new InsufficientCreditsError(
    "Insufficient credits",
    { available: user.credits, required: cost }
  );
}

// ❌ Bad - Don't return JSON directly or throw generic Error
return c.json({ error: "Not found" }, 404); // Wrong!
throw new Error("User not found"); // Wrong!
```

**Available Error Classes:**
- `NotFoundError(message, details?)` - 404
- `ValidationError(message, details?)` - 400
- `UnauthorizedError(message, details?)` - 401
- `ForbiddenError(message, details?)` - 403
- `InsufficientCreditsError(message, details?)` - 402
- `ConflictError(message, details?)` - 409
- `TooManyRequestsError(message, details?)` - 429
- `AppError(message, statusCode, code, details?)` - Custom status

**Error Middleware:** Automatically logs errors with structured context and returns consistent JSON:
```json
{
  "error": "NOT_FOUND",
  "message": "User not found",
  "details": { "userId": "123" }
}
```

---

## Testing Standards

### Test Structure (Vitest)
```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("Feature Name", () => {
  beforeEach(() => {
    // Setup before each test
  });

  it("should do something specific", () => {
    // Arrange
    const input = createMockData();
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

### Test Patterns
- Use `describe` for grouping related tests
- Use `it` for individual test cases
- Use descriptive test names: "should [expected behavior] when [condition]"
- Use real database via TestContainers, mock only external APIs
- Test edge cases and error conditions
- Keep tests isolated with `cleanDatabase()` in `beforeEach`

---

## Tooling Standards

### ESLint Configuration
- Web: Next.js, React, React Hooks, TypeScript, Prettier
- API: TypeScript, Next.js core-web-vitals (legacy config)
- Max warnings: 0 (all warnings treated as errors)
- Run before committing: `bun run lint`

### TypeScript Configuration
- Target: ES2022
- Module: ESNext
- Module Resolution: bundler
- Strict mode enabled
- No unchecked indexed access
- Isolated modules for faster builds

### Database (Drizzle ORM)
- Schema location: `api/src/database/schema/`
- Never write raw SQL without parameterization
- Use Drizzle query builder for all operations
- Generate migrations: `bun run db:generate`
- Apply in dev: `bun run db:push`
- Apply in prod: `bun run db:migrate`

---

## Authentication (Clerk)

**Web:** `@clerk/nextjs@6.37.3`, `clerkMiddleware()` in middleware, `<ClerkProvider>` in layout
**API:** `@clerk/clerk-sdk-node@5.1.6`, JWT verification in `src/middleware/auth.ts`
**Flow:** Frontend → `Authorization: Bearer <token>` → API verifies → `c.get('auth').userId`

```typescript
// Protected API route
router.post("/", authMiddleware, async (c) => {
  const { userId } = uth");
  // Use userId for authorization
});
```

---

## Critical Rules

1. **Package Manager:** Always `bun`, never npm/yarn/pnpm
2. **Environment:** Import from `@/config/env`, never `process.env` directly (API only)
3. **Logging:** Import from `@/utils/logger`, never `console.log/error/warn` (API only)
4. **Error Handling:** Throw custom errors from `@/errors`, never generic `Error` or direct JSON responses (API only)
5. **Types:** Strict mode, no `any`, explicit return types
6. **Imports:** Follow order (external → shared → internal → relative)
7. **Naming:** kebab-case files, PascalCase components/types, camelCase functions
8. **Auth:** Use `c.get('auth')` in protected routes
9. **Database:** Drizzle ORM only, never raw SQL without parameterization
10. **Validation:** Zod schemas for all input validation
11. **Testing:** Vitest with `describe`/`it`/`expect`, use `--run` flag
12. **Documentation:** NEVER create .md files unless explicitly requested
13. **Styling:** NEVER hardcode `globals.css` - use `shadcn` CLI tools
14. **Array Access:** Always check for undefined when accessing array elements

---

## Common Patterns

### API Route (Hono)
```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { db, schema } from "@/database";
import { authMiddleware } from "@/middleware/auth";
import { NotFoundError, ValidationError } from "@/errors";
import { logger } from "@/utils/logger";

export const router = new Hono();

const inputSchema = z.object({ 
  title: z.string().min(1) 
});

router.post("/", authMiddleware, zValidator("json", inputSchema), async (c) => {
  const { userId } = c.get("auth");
  const data = c.req.valid("json");
  
  const [result] = await db
    .insert(schema.documents)
    .values({ ...data, userId })
    .returning();
  
  if (!result) {
    throw new NotFoundError("Failed to create document");
  }
  
  logger.info({ userId, documentId: result.id }, "Document created");
  return c.json(result, 201);
});
```

### Database Query
```typescript
import { db, schema, eq, and } from "@/database";
import { NotFoundError } from "@/errors";

// Select with conditions
const documents = await db
  .select()
  .from(schema.documents)
  .where(and(
    eq(schema.documents.userId, userId),
    eq(schema.documents.id, documentId)
  ));

// Handle undefined array access
const document = documents[0]; // Type: Document | undefined
if (!document) {
  throw new NotFoundError("Document not found");
}
```

---

## Testing with TestContainers

**Integration Tests:** Use real PostgreSQL (pgvector) and Redis containers via TestContainers
**Isolation:** Each test suite gets clean database state via `cleanDatabase()` helper
**No Conflicts:** Test containers use random ports, never conflict with dev database (port 5440)

### Running Tests
```bash
# All tests (starts containers automatically)
cd api && bun run test -- --run

# Single integration test by pattern
bun run test -- --run credit-manager

# E2E tests with real APIs (requires GOOGLE_API_KEY)
export GOOGLE_API_KEY="your-key"
bun run test -- --run stream-interceptor.e2e

# Watch mode (for development)
bun run test

# Note: Docker must be running for TestContainers to work
```

### Test Types

**Unit Tests:** Mock everything, test logic in isolation
**Integration Tests:** Real database (TestContainers), mock external APIs
**E2E Tests:** Real database + real external APIs (Gemini, etc.)

### Writing Integration Tests
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { cleanDatabase, seedTestUser, getUserCredits } from "../helpers/test-database-service";

describe("MyService Integration Tests", () => {
  beforeEach(async () => {
    // Clean database before each test for isolation
    await cleanDatabase();
    
    // Seed test data
    await seedTestUser("test-user-id", 1000);
  });

  it("should test real database operations", async () => {
    // Test with real database, not mocks
    const credits = await getUserCredits("test-user-id");
    expect(credits).toBe(1000);
  });
});
```

### Writing E2E Tests
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { AgentService } from "@/services/agent";
import { cleanDatabase, seedTestUser, getTestDb } from "../helpers/db-helpers";

describe("My Feature E2E Tests (Real API)", () => {
  let agentService: AgentService;

  beforeEach(async () => {
    await cleanDatabase();
    await seedTestUser("test-user", 10000);
    
    const db = getTestDb();
    agentService = new AgentService(db, new CreditManager());
  });

  it("should work with real Gemini API", async () => {
    // Makes real API call - costs apply!
    const response = await agentService.streamChatResponse("test-user", messages);
    expect(response).toBeDefined();
  }, 30000); // Longer timeout for real API
});
```

### Test Helpers (api/tests/helpers/)
- `test-database-service.ts` - TestContainers setup and database helpers
- `cleanDatabase()` - Truncate all tables between tests
- `seedTestUser(id, credits)` - Create test user with credits
- `getUserCredits(userId)` - Get current credit balance
- `getTestDb()` - Get database connection for tests

### Mock Strategy
- **Mock external APIs:** Gemini, Clerk, R2, Firecrawl (avoid costs, faster tests)
- **Use real database:** All database operations use TestContainers
- **Test real logic:** Credit management, transactions, constraints, rollbacks
- **E2E when needed:** Use real APIs only for final verification before releases

---

## Troubleshooting

**Type errors:** Run `bun run typecheck`, check `@/config/env.ts`, verify schema matches DB
**Build fails:** `rm -rf .next && bun install`, check for circular dependencies
**Auth issues:** Verify Clerk keys in `.env` files, check CORS, ensure middleware is applied
**Database:** `docker compose up -d`, verify `DATABASE_URL` in `api/.env`
**Tests failing:** Ensure Docker is running, check `api/tests/integration.setup.ts`, verify TestContainers can pull images
**Test containers slow:** First run pulls images (~5-10s), subsequent runs are faster
**Lint errors:** Run `bun run lint` to see all issues, fix before committing

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
bun run test -- --run bibtex     # Single test by pattern match
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

### Environment Variables (API Only)
**CRITICAL:** Never use `process.env` directly. Always import from `@/config/env`:

```typescript
// ✅ Good
import { env } from "@/config/env";
const key = env.GOOGLE_API_KEY;

// ❌ Bad
const key = process.env.GOOGLE_API_KEY;
```

### Naming Conventions
- Files: `kebab-case.ts`
- Components: `PascalCase.tsx`
- Functions/variables: `camelCase()`
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase`
- Private functions: `_camelCase()` (prefix with underscore)

### Error Handling
```typescript
// API routes - return JSON with error field
return c.json({ 
  error: 'Validation failed', 
  message: error.message,
  details: error.flatten() 
}, 400);

// Services - throw typed errors
throw new Error('Invalid input');

// Always handle async errors
try {
  await riskyOperation();
} catch (error) {
  console.error('Operation failed:', error);
  throw error;
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
3. **Types:** Strict mode, no `any`, explicit return types
4. **Imports:** Follow order (external → shared → internal → relative)
5. **Naming:** kebab-case files, PascalCase components/types, camelCase functions
6. **Auth:** Use `c.get('auth')` in protected routes
7. **Database:** Drizzle ORM only, never raw SQL without parameterization
8. **Validation:** Zod schemas for all input validation
9. **Testing:** Vitest with `describe`/`it`/`expect`, use `--run` flag
10. **Documentation:** NEVER create .md files unless explicitly requested
11. **Styling:** NEVER hardcode `globals.css` - use `shadcn` CLI tools
12. **Array Access:** Always check for undefined when accessing array elements

---

## Common Patterns

### API Route (Hono)
```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { db, schema } from "@/database";
import { authMiddleware } from "@/middleware/auth";

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
  
  return c.json({ success: true, data: result });
});
```

### Database Query
```typescript
import { db, schema, eq, and } from "@/database";

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
  return c.json({ error: "Not found" }, 404);
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
import { cleanDatabase, seedTestUser, getUserCredits } from "../helpers/db-helpers";

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

### Test Helpers (api/tests/helpers/db-helpers.ts)
- `cleanDatabase()` - Truncate all tables between tests
- `seedTestUser(id, credits)` - Create test user with credits
- `seedTestDocument(userId, title)` - Create test document
- `getUserCredits(userId)` - Get current credit balance
- `getUserCreditLogs(userId)` - Get all credit logs
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

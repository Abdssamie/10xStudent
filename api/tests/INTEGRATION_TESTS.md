# Integration Testing with TestContainers

## Setup Complete ✅

TestContainers is now configured and working for the 10xStudent API project.

### What's Included

**Infrastructure:**
- PostgreSQL with pgvector extension (matches production: `pgvector/pgvector:pg16`)
- Redis (matches production: `redis:7-alpine`)
- Automatic container lifecycle management (start before tests, cleanup after)
- Isolated test databases (random ports, no conflicts with dev database)

**Test Helpers:** (`api/tests/helpers/db-helpers.ts`)
- `cleanDatabase()` - Truncate all tables between tests
- `seedTestUser(id, credits)` - Create test user with credits
- `seedTestDocument(userId, title)` - Create test document
- `getUserCredits(userId)` - Get current credit balance
- `getUserCreditLogs(userId)` - Get all credit logs
- `getTestDb()` - Get database connection for tests

**Integration Tests:**
- ✅ `credit-manager.integration.test.ts` - Real database transactions, locks, rollbacks
- ✅ `agent.integration.test.ts` - Real credit management with mocked AI APIs
- ✅ `stream-interceptor.test.ts` - Async generator pattern testing
- ✅ `schema.integration.test.ts` - Database schema validation

## Running Tests

```bash
# All tests (starts containers automatically)
cd api && bun run test -- --run

# Single integration test by pattern
bun run test -- --run credit-manager

# Watch mode (for development)
bun run test

# Note: Docker must be running for TestContainers to work
```

## Writing Integration Tests

### Basic Pattern

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { cleanDatabase, seedTestUser, getUserCredits } from "../helpers/db-helpers";

describe("MyService Integration Tests", () => {
  const testUserId = "test-user-id";

  beforeEach(async () => {
    // Clean database before each test for isolation
    await cleanDatabase();
    
    // Seed test data
    await seedTestUser(testUserId, 1000);
  });

  it("should test real database operations", async () => {
    // Test with real database, not mocks
    const credits = await getUserCredits(testUserId);
    expect(credits).toBe(1000);
  });
});
```

### Mock Strategy

- **Mock external APIs:** Gemini, Clerk, R2, Firecrawl (avoid costs, faster tests)
- **Use real database:** All database operations use TestContainers
- **Test real logic:** Credit management, transactions, constraints, rollbacks

Example:
```typescript
// Mock external AI service
vi.mock("@tanstack/ai", () => ({
  chat: vi.fn(),
}));

// Use real database and credit manager
const db = getTestDb();
const creditManager = new CreditManager();
const agentService = new AgentService(db, creditManager);
```

## Benefits of Integration Tests

1. **Catch Real Bugs:** Tests actual SQL queries, not mock configurations
2. **Refactor Safely:** Change implementation, tests verify behavior
3. **Test Performance:** Catch N+1 queries, slow operations, deadlocks
4. **Verify Transactions:** Test rollback behavior, concurrent operations
5. **Schema Validation:** Tests catch schema mismatches immediately

## Migration from Mock Tests

### Before (Mock Theater)
```typescript
vi.mock("@/database", () => ({
  db: { select: vi.fn() }
}));

it("should return mocked data", async () => {
  db.select.mockReturnValue({ from: () => ({ where: () => [{ id: "mock" }] }) });
  const result = await getUser("id");
  expect(result.id).toBe("mock"); // Tests nothing real
});
```

### After (Integration Test)
```typescript
it("should create and retrieve user from real database", async () => {
  // Arrange
  await seedTestUser("real-id", 100);
  
  // Act
  const result = await getUser("real-id");
  
  // Assert
  expect(result.id).toBe("real-id");
  expect(result.credits).toBe(100);
});
```

## Troubleshooting

**Tests failing:** Ensure Docker is running (`docker ps`)
**Containers slow:** First run pulls images (~5-10s), subsequent runs are faster
**Port conflicts:** TestContainers uses random ports, shouldn't conflict
**Schema errors:** Check `api/tests/integration.setup.ts` for tablinitions
**Connection errors:** Verify `DATABASE_URL` is set by integration.setup.ts

## Architecture

```
api/
├── tests/
│   ├── integration.setup.ts          # Global setup (starts containers)
│   ├── setup.ts                       # Test environment variables
│   ├── helpers/
│   │   └── db-helpers.ts             # Database utilities
│   ├── services/
│   │   ├── credit-manager.integration.test.ts
│   │   ├── agent.integration.test.ts
│   │   └── stream-interceptor.test.ts
│   └── database/
│       └── schema.integration.test.ts
└── vitest.config.ts                   # Vitest configuration
```

## Next Steps

### Recommended Tests to Add

1. **Document CRUD operations** - Test with real database and file storage
2. **Source/RAG tools** - Test with real embeddings and pgvector
3. **Chat routes** - Test with real database and mocked auth
4. **Webhook handlers** - Test with real database

### Converting Existing Mock Tests

1. Keep existing mock tests initially
2. Add integration tests alongside (`.integration.test.ts`)
3. Verify integration tests pass and catch real bugs
4. Remove mock tests once integration tests are stable
5. Rename integration tests (remove `.integration` suffix)

## Performance

- **Container startup:** ~5-10s (one-time per test run)
- **Test execution:** Similar to mock tests once containers are running
- **Database cleanup:** ~50-100ms per test (truncate tables)
- **Total overhead:** Acceptable for the confidence gained

## Configuration

**TestContainers:** `api/tests/integration.setup.ts`
- PostgreSQL: `pgvector/pgvector:pg16`
- Redis: `redis:7-alpine`
- Random ports (no conflicts)
- Automatic cleanup

**Vitest:** `api/vitest.config.ts`
- Global setup: `./tests/integration.setup.ts`
- Test timeout: 30s
- Hook timeout: 60s

**Environment:** `api/tests/setup.ts`
- Sets test environment variables
- DATABASE_URL provided by TestContainers


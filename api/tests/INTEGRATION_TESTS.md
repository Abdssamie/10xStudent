# Integration Testing with TestContainers

## TODO: Setup Instructions

### 1. Install TestContainers Dependencies

```bash
bun add -D testcontainers @testcontainers/postgresql @testcontainers/redis
```

### 2. Update vitest.config.ts

Add the global setup file:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: './tests/integration.setup.ts',
    // ... other config
  },
});
```

### 3. Write Integration Tests

Replace mock-based tests with integration tests using real infrastructure:

**Before (Mock Theater):**
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

**After (Integration Test):**
```typescript
it("should create and retrieve user from real database", async () => {
  // Arrange
  await db.insert(users).values({ id: "real-id", credits: 100 });
  
  // Act
  const result = await getUser("real-id");
  
  // Assert
  expect(result.id).toBe("real-id");
  expect(result.credits).toBe(100);
});
```

### 4. Run Integration Tests

```bash
# Run only integration tests
bun run test -- tests/services/*.integration.test.ts

# Run all tests (unit + integration)
bun run test
```

## Migration Plan

### Phase 1: Critical Path (High Priority)
1. `CreditManager` - Already started (see `credit-manager.integration.test.ts`)
2. `AgentService` - Test token tracking with real DB
3. Authentication middleware - Test with real Clerk or mock auth server
4. Document CRUD operations - Test with real database

### Phase 2: Feature Coverage (Medium Priority)
1. Credit refresh job - Test monthly reset logic
2. Source/RAG tools - Test with real embeddings and pgvector
3. File upload/download - Test with real R2/S3

### Phase 3: E2E (Low Priority)
1. Full chat flow with authentication
2. Document compilation pipeline
3. Webhook handlers

## Benefits of Integration Tests

1. **Catch Real Bugs**: Tests actual SQL queries, not mock configurations
2. **Refactor Safely**: Change implementation, tests verify behavior
3. **Test Real Performance**: Catch N+1 queries, slow operations
4. **Verify Transactions**: Test rollback behavior, deadlock handling
5. **Schema Validation**: Tests catch schema mismatches

## Running Tests

```bash
# Start Docker (required for TestContainers)
docker ps

# Run tests
bun run test

# Run with coverage
bun run test -- --coverage

# Run specific test file
bun run test -- tests/services/credit-manager.integration.test.ts
```

# End-to-End Tests with Real APIs

## Overview

E2E tests use real external APIs (Gemini, TanStack AI) to verify the complete flow works in production scenarios. These tests are separate from integration tests and should be run manually when needed.

## Test Files

- `stream-interceptor.e2e.test.ts` - Real Gemini API stream interception and token tracking

## Prerequisites

### 1. Valid API Credentials

You need a real Google API key with Gemini API access:

```bash
# Get your API key from: https://aistudio.google.com/app/apikey
export GOOGLE_API_KEY="your-real-api-key-here"
```

### 2. Docker Running

TestContainers needs Docker for the database:

```bash
docker ps  # Verify Docker is running
```

### 3. API Costs

⚠️ **Warning:** These tests make real API calls which incur costs:
- Each test makes 1-3 API calls to Gemini
- Typical cost: $0.001 - $0.01 per test run
- Total test suite: ~$0.05 per run

## Running E2E Tests

### Run All E2E Tests

```bash
cd api

# Set your real API key
export GOOGLE_API_KEY="AIzaSy..."

# Run E2E tests
bun run test -- --run e2e
```

### Run Specific E2E Test

```bash
# Run only stream interceptor E2E tests
bun run test -- --run stream-interceptor.e2e

# Run single test by name
bun run test -- --run "should intercept real Gemini API stream"
```

### Skip E2E Tests in CI

E2E tests are automatically skipped in CI/CD unless explicitly enabled:

```bash
# Regular tests (no E2E)
bun run test -- --run

# Include E2E tests
E2E_TESTS=true bun run test -- --run
```

## What E2E Tests Verify

### Stream Interceptor E2E Tests

1. **Real API Stream Interception**
   - Makes actual Gemini API call
   - Verifies async generator pattern works
   - Tracks real token usage from API response
   - Confirms credit deduction matches actual usage

2. **Token Tracking Accuracy**
   - Longer prompts = more tokens
   - Minimal prompts = minimum 1 credit
   - Token counts match API response

3. **Concurrent Requests**
   - Multiple simultaneous API calls
   - Proper credit management under load
   - No race conditions in credit finalization

4. **Error Handling**
   - Insufficient credits prevent API calls
   - No charges for failed requests
   - Proper rollback on errors

## Test Output Example

```
✅ Real API test completed:
   - Tokens used: 45
   - Credits charged: 1
   - Stream chunks received: 12

✅ Longer response test completed:
   - Tokens used: 234
   - Credits charged: 1

✅ Concurrent requests test completed:
   - Total requests: 3
   - Total tokens: 156
   - Total credits: 1
```

## Troubleshooting

### "Invalid API Key" Error

```bash
# Verify your API key is set
echo $GOOGLE_API_KEY

# Make sure it starts with "AIzaSy"
# Get a new key from: https://aistudio.google.com/app/apikey
```

### "Quota Exceeded" Error

You've hit Gemini API rate limits:
- Free tier: 60 requests per minute
- Wait a minute and try again
- Or upgrade your API quota

### Tests Timeout

E2E tests have longer timeouts (30-60s):
- Network latency to Gemini API
- API processing time
- This is normal for E2E tests

### Database Connection Errors

TestContainers needs Docker:
```bash
# Start Docker
docker ps

# If not running, start Docker Desktop
```

## Best Practices

### When to Run E2E Tests

✅ **Run E2E tests when:**
- Before major releases
- After changing stream handling code
- After updating Gemini/TanStack AI versions
- When debugging production issues

❌ **Don't run E2E tests:**
- On every commit (use integration tests instead)
- In CI/CD pipelines (unless explicitly needed)
- When developing unrelated features

### Cost Management

To minimize API costs:

1. **Use Integration Tests First**
   - Integration tests use mocked APIs (free)
   - Only run E2E when you need real API verification

2. **Run Selectively**
   ```bash
   # Run only one E2E test
   bun run test -- --run "should intercept real Gemini API stream"
   ```

3. **Use Short Prompts**
   - E2E tests use minimal prompts to reduce token usage
   - "Say 'Hello World'" instead of long essays

## Configuration

### Environment Variables

```bash
# Required for E2E tests
GOOGLE_API_KEY=AIzaSy...

# Optional: Skip E2E in CI
E2E_TESTS=false  # Default in CI

# Optional: Custom timeout
TEST_TIMEOUT=60000  # 60 seconds
```

### Vitest Configuration

E2E tests have custom timeouts in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    testTimeout: 30000,  // 30s for regular tests
    hookTimeout: 60000,  // 60s for setup/teardown
  },
});
```

Individual E2E tests can override:

```typescript
it("should test something", async () => {
  // test code
}, 60000); // 60 second timeout for this test
```

## Comparison: Integration vs E2E Tests

| Aspect | Integration Tests | E2E Tests |
|--------|------------------|-----------|
| **APIs** | Mocked | Real |
| **Cost** | Free | ~$0.05/run |
| **Speed** | Fast (~2s) | Slow (~30s) |
| **Reliability** | High | Medium (network) |
| **When to Run** | Every commit | Before releases |
| **Database** | Real (TestContainers) | Real (TestContainers) |

## Adding New E2E Tests

### 1. Create Test File

```typescript
// tests/services/my-feature.e2e.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { MyService } from "@/services/my-service";
import { cleanDatabase, seedTestUser, getTestDb } from "../helpers/db-helpers";

describe("My Feature E2E Tests (Real API)", () => {
  let myService: MyService;

  beforeEach(async () => {
    await cleanDatabase();
    await seedTestUser("test-user", 10000);
    
    const db = getTestDb();
    myService = new MyService(db);
  });

  it("should work with real API", async () => {
    // Make real API call
    const result = await myService.doSomething();
    
    // Verify real behavior
    expect(result).toBeDefined();
  }, 30000); // Custom timeout
});
```

### 2. Document API Requirements

Add to this file:
- Required API keys
- Expected costs
- Rate limits
- Special setup

### 3. Add to Test Suite

E2E tests are automatically discovered by pattern: `*.e2e.test.ts`

## Summary

E2E tests provide confidence that the system works with real APIs, but should be used sparingly due to costs and speed. Use integration tests for regular development, and E2E tests for final verification before releases.

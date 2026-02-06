---
name: vitest-best-practices
description: Best practices for Vitest testing framework including unit tests, mocking, assertions, test organization, and performance optimization.

---

# Vitest Best Practices

Comprehensive guide for using Vitest, a fast Vite-native testing framework.

## When to Use

- When writing unit tests for JavaScript/TypeScript code
- When testing React, Vue, or other framework components
- When you need fast test execution with watch mode
- When migrating from Jest (Vitest is Jest-compatible)
- When working with Vite-based projects

## Core Principles

### 1. Test Organization

Keep tests close to source code for better discoverability.

### 2. AAA Pattern

Follow Arrange-Act-Assert pattern for clarity.

### 3. Use vi for Mocking

Use Vitest vi helper for mocking functions and modules.

### 4. Handle Async Code

Use async/await and proper assertions for promises.

### 5. Clean Up After Tests

Always clean up mocks and side effects in afterEach.

## Common Patterns

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('Math functions', () => {
  it('should add two numbers', () => {
    const result = 2 + 3;
    expect(result).toBe(5);
  });
});
```

### Mocking Functions

```typescript
import { vi } from 'vitest';

const mockFn = vi.fn();
mockFn('hello');
expect(mockFn).toHaveBeenCalledWith('hello');

const spy = vi.spyOn(obj, 'method');
expect(spy).toHaveBeenCalled();
```

### Mocking Modules

```typescript
vi.mock('./api', () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: 'mocked' }))
}));
```

### Async Testing

```typescript
it('should resolve with value', async () => {
  await expect(Promise.resolve(42)).resolves.toBe(42);
});

it('should reject with error', async () => {
  await expect(Promise.reject(new Error('Failed')))
    .rejects.toThrow('Failed');
});
```

### Setup and Teardown

```typescript
import { beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  // Setup before each test
});

afterEach(() => {
  vi.clearAllMocks();
});
```

## Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/'],
    },
  },
});
```

## Best Practices

1. Keep tests focused on one thing
2. Use descriptive test names
3. Mock external dependencies only
4. Test edge cases and error conditions
5. Run tests in parallel for performance
6. Use watch mode during development
7. Maintain reasona coverage
8. Clean up mocks after each test
9. Follow AAA pattern consistently
10. Test behavior, not implementation

## Performance Tips

1. Enable parallel execution with threads
2. Use watch mode with --changed flag
3. Minimize setup in beforeEach
4. Use shallow rendering when appropriate
5. Avoid expensive operations in tests

## Anti-Patterns to Avoid

1. Over-mocking internal code
2. Testing implementation details
3. Writing flaky tests
4. Creating long test functions
5. Ignoring test failures
6. Not cleaning up after tests
7. Testing multiple things in one test

## Common Assertions

```typescript
// Equality
expect(value).toBe(5);
expect(object).toEqual({ name: 'John' });

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();

// Numbers
expect(value).toBeGreaterThan(10);
expect(value).toBeLessThan(100);

// Strings
expect(string).toContain('substring');

// Arrays
expect(array).toHaveLength(3);

// Functions
expect(fn).toThrow();
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith(arg1, arg2);
```

## Questions to Ask

- What testing environment do you need (jsdom, node, happy-dom)?
- Should we set up code coverage reporting?
- Do you want to use globals or explicit imports?
- What coverage threshold should we aim for?
- Should we configure snapshot testing?
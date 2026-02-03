---
description: Guide the agent through implementing a specific hole (component marked with `@progress: 0`).
---

## When to Use
- After identifying a ready hole with `/incode-next`
- When explicitly asked to implement a specific component

## Workflow

### Step 1: Verify Readiness
Before implementing, check:
```bash
incode scan --format json | grep <hole-id>
```

Verify:
- Hole exists and has `@progress: 0`
- All `@deps` are at `@progress: 90+` (or don't exist yet)
- You have all required `@skills` in your toolkit

### Step 2: Read the Spec
Carefully read the `@spec` field:
- What is the expected behavior?
- What methods/functions are needed?
- What edge cases should be handled?
- What are the input/output types?

### Step 3: Implement
Write the implementation following:
- The architecture defined in the hole (interface/signature)
- The skills specified in `@skills` array
- Best practices for the language/framework
- Handle edge cases and errors

### Step 4: Update Progress
As you implement, update `@progress` based on confidence:
- `@progress: 50` - Basic implementation, missing edge cases
- `@progress: 90` - Acceptable, handles main cases
- `@progress: 95` - Production-ready, handles edge cases
- `@progress: 100` - Complete with tests (if applicable)

### Step 5: Implement Tests (If Applicable)
If the component has `@tests` reference:
1. Find the test hole by ID
2. Implement tests covering:
   - Happy paths
   - Edge cases
   - Error handling
3. Update test hole progress to `@progress: 100`

### Step 6: Verify
```bash
incode scan --validate
```

Check for:
- No validation warnings
- All cross-references are valid
- Progress accurately reflects confidence

## Example

### Before Implementation
```typescript
/**
 * @id: token-validator
 * @priority: high
 * @progress: 0
 * @tests: ["token-validator-tests"]
 * @spec: JWT token validation and generation utility. Generate tokens with 24h expiry. Verify tokens and return userId.
 * @skills: ["<your-language>", "jwt"]
 */
interface TokenValidator {
  generate(userId: string): string;
  verify(token: string): { userId: string } | null;
}
```

### After Implementation
```typescript
import jwt from 'jsonwebtoken';

/**
 * @id: token-validator
 * @priority: high
 * @progress: 95
 * @tests: ["token-validator-tests"]
 * @spec: JWT token validation and generation utility. Generate tokens with 24h expiry. Verify tokens and return userId.
 * @skills: ["<your-language>", "jwt"]
 */
class TokenValidator {
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  generate(userId: string): string {
    return jwt.sign({ userId }, this.secret, { expiresIn: '24h' });
  }

  verify(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, this.secret) as { userId: string };
      return { userId: decoded.userId };
    } catch (error) {
      return null;
    }
  }
}

export default TokenValidator;
```

### Implement Tests
```typescript
/**
 * @id: token-validator-tests
 * @priority: high
 * @progress: 100
 * @deps: ["token-validator"]
 * @spec: Tests for TokenValidator - test token generation and verification
 * @skills: ["<your-language>", "<your-test-framework>"]
 */
import { describe, it, expect } from 'vitest';
import TokenValidator from './token-validator';

describe('TokenValidator', () => {
  const validator = new TokenValidator('test-secret');

  it('should generate valid token', () => {
    const token = validator.generate('user-123');
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
  });

  it('should verify valid token', () => {
    const token = validator.generate('user-123');
    const result = validator.verify(token);
    expect(result).toEqual({ userId: 'user-123' });
  });

  it('should return null for invalid token', () => {
    const result = validator.verify('invalid-token');
    expect(result).toBeNull();
  });

  it('should return null for expired token', () => {
    // Test with expired token
    const expiredToken = jwt.sign({ userId: 'user-123' }, 'test-secret', { expiresIn: '-1h' });
    const result = validator.verify(expiredToken);
    expect(result).toBeNull();
  });
});
```

## Important Rules

1. **Follow the architecture** - Implement exactly what the hole defines
2. **Use specified skills** - Follow patterns from `@skills` array
3. **Update progress honestly** - Reflect true confidence, not wishful thinking
4. **Handle edge cases** - Don't just implement happy paths
5. **Write tests for business logic** - Data models/types don't need tests
6. **Keep metadata updated** - Update `@progress` as you go

## Progress Guidelines

- `@progress: 0` - Hole (not started)
- `@progress: 50` - Basic implementation, incomplete
- `@progress: 90` - Acceptable, main functionality works
- `@progress: 95` - Production-ready, handles edge cases and errors
- `@progress: 100` - Complete with tests (if applicable)

## Common Mistakes to Avoid

❌ **Don't mark `@progress: 100` without tests** (if tests are referenced)
❌ **Don't leave stub implementations** (e.g., throwing "not implemented" errors) and mark high progress - stubs are only for holes at `@progress: 0`
❌ **Don't implement only happy paths** and mark as production-ready
❌ **Don't forget to update test hole progress** after writing tests
❌ **Don't change the interface** defined in the hole without updating dependents
❌ **Don't worry about LSP errors in holes** - They're expected until implementation is complete

## Next Steps

After implementation:
- Use `/incode-next` to find the next hole to implement
- Use `/incode-status` to see overall project progress
- Use `/incode-validate <id>` to verify implementation matches spec

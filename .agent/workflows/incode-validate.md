# /incode-validate - Validate Implementation Against Spec

## Purpose
Verify that an implementation matches its specification and is truly complete.

## When to Use
- After implementing a component
- Before marking `@progress: 100`
- When reviewing code quality
- When user reports a bug

## Workflow

### Step 1: Run Incode Validation
```bash
incode scan --validate
```

Check for:
- ✅ No validation warnings
- ✅ All cross-references are valid
- ✅ IDs are in kebab-case
- ✅ Progress values are valid (0-100)

### Step 2: Verify Against Spec
Read the `@spec` field and check:
- ✅ All required methods/functions are implemented
- ✅ Input/output types match the specification
- ✅ Edge cases mentioned in spec are handled
- ✅ Error handling is implemented

### Step 3: Check Dependencies
If component has `@deps`:
```bash
incode scan --format json | grep <dep-id>
```

Verify:
- ✅ All dependencies exist
- ✅ All dependencies are at `@progress: 90+`
- ✅ Implementation uses dependencies correctly

### Step 4: Verify Tests (If Applicable)
If component has `@tests`:
```bash
incode scan --format json | grep <test-id>
```

Check:
- ✅ Test block exists
- ✅ Tests are at `@progress: 100`
- ✅ Tests cover main functionality
- ✅ Tests cover edge cases
- ✅ All tests pass

### Step 5: Code Quality Check
Review implementation for:
- ✅ No stub implementations left (functions that throw "not implemented" errors)
- ✅ No TODO comments left
- ✅ No hardcoded values that should be configurable
- ✅ Proper error handling
- ✅ Follows skills/patterns from `@skills` array

### Step 6: Adjust Progress
Based on validation results:
- If issues found → Lower `@progress` to reflect reality
- If all checks pass → Confirm or increase `@progress`

## Example

### Validation Checklist for `token-validator`

```typescript
/**
 * @id: token-validator
 * @priority: high
 * @progress: 95
 * @tests: ["token-validator-tests"]
 * @spec: JWT token validation and generation utility. Generate tokens with 24h expiry. Verify tokens and return userId.
 * @skills: ["<your-language>", "<auth-library>"]
 */
```

**Spec Requirements:**
- ✅ Generate tokens with 24h expiry
- ✅ Verify tokens and return userId
- ✅ Handle invalid tokens
- ✅ Handle expired tokens

**Implementation Check:**
```typescript
class TokenValidator {
  generate(userId: string): string {
    return jwt.sign({ userId }, this.secret, { expiresIn: '24h' }); // ✅ 24h expiry
  }

  verify(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, this.secret) as { userId: string };
      return { userId: decoded.userId }; // ✅ Returns userId
    } catch (error) {
      return null; // ✅ Handles invalid/expired tokens
    }
  }
}
```

**Tests Check:**
```bash
$ incode scan --format json | grep token-validator-tests
```
- ✅ Tests exist
- ✅ Tests at `@progress: 100`
- ✅ Tests cover: valid token, invalid token, expired token

**Result:** Implementation is valid, `@progress: 95` is accurate (production-ready)

## Validation Scenarios

### Scenario 1: Implementation Incomplete
```
/**
 * @id: auth-service
 * @progress: 90
 * @spec: Authentication service. Methods: login, register, validateToken, refreshToken
 */
class AuthService {
  login(email, password) {
    // Implemented
  }
  
  register(email, password) {
    // Implemented
  }
  
  validateToken(token) {
    // ❌ Still a stub - not implemented!
  }
  
  refreshToken(token) {
    // ❌ Still a stub - not implemented!
  }
}
```

**Action:** Lower `@progress` to `50` (only 2/4 methods implemented)

### Scenario 2: Missing Edge Cases
```typescript
/**
 * @id: user-validator
 * @progress: 95
 * @spec: Validate user input. Check email format, password strength (min 8 chars, 1 uppercase, 1 number)
 */
function validateUser(email: string, password: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && password.length >= 8; // ❌ Missing uppercase/number check!
}
```

**Action:** Lower `@progress` to `90` (missing password strength requirements)

### Scenario 3: Tests Missing
```typescript
/**
 * @id: payment-processor
 * @progress: 100
 * @tests: ["payment-processor-tests"]
 * @spec: Process payments via Stripe
 */
```

```bash
$ incode scan --format json | grep payment-processor-tests
# Result: @progress: 0 (tests not implemented!)
```

**Action:** Lower `@progress` to `95` (implementation complete but tests missing)

## Important Rules

1. **Be honest about progress** - Don't mark complete if it's not
2. **Validate before marking 100** - Always run this command first
3. **Check tests exist and pass** - If `@tests` is specified
4. **Verify all spec requirements** - Read the spec carefully
5. **Lower progress if issues found** - Reflect reality, not hope

## Progress Decision Matrix

| Situation | Progress |
|-----------|----------|
| Not started | 0 |
| Basic implementation, missing features | 50 |
| Main functionality works, missing edge cases | 90 |
| Handles edge cases, production-ready | 95 |
| Complete with passing tests (if applicable) | 100 |

## Next Steps

After validation:
- If issues found → Fix them with `/incode-implement <id>`
- If complete → Use `/incode-next` to find next task
- If all done → Use `/incode-status` to see project health

# Incode Integration Guide for OpenCode

This guide explains how to integrate Incode commands into your OpenCode workflow for reliable AI-driven development.

> **Note:** Examples in this guide use TypeScript for illustration, but **Incode is language-agnostic** and works with any programming language (Python, C#, Java, Go, Rust, PHP, etc.). Simply adapt the syntax to your language while keeping the metadata format the same.

## Quick Setup

### 1. Install Incode
```bash
npm install incode
# or
bun install incode
```

### 2. Add Commands to OpenCode

Copy the command files from `opencode-commands/` to your OpenCode skills directory, or reference them in your OpenCode configuration.

### 3. Start Using
```
User: "Add user authentication"
Agent: [Uses /incode-start to create architecture holes]
```

## Command Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/incode-start` | Create architecture holes | Starting new features |
| `/incode-next` | Find next task | After creating holes or completing work |
| `/incode-implement <id>` | Implement a hole | When ready to code |
| `/incode-validate <id>` | Verify implementation | Before marking complete |
| `/incode-status` | Project overview | Start of session, planning |

## Complete Workflow Example

### User Request
```
"Build a REST API for user management with authentication"
```

### Agent Workflow

#### Step 1: Create Architecture (`/incode-start`)

```typescript
// Agent creates holes for the entire feature

/**
 * @id: user-model
 * @priority: high
 * @progress: 0
 * @spec: User data model with id, email, passwordHash, createdAt, updatedAt
 * @skills: ["<your-language>"]
 */
interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * @id: user-repository
 * @priority: high
 * @progress: 0
 * @deps: ["user-model", "database-connection"]
 * @tests: ["user-repository-tests"]
 * @spec: Repository for user CRUD operations
 * @skills: ["<your-language>", "drizzle-orm"]
 */
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(email: string, passwordHash: string): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
}

/**
 * @id: auth-service
 * @priority: high
 * @progress: 0
 * @deps: ["user-repository", "token-service"]
 * @tests: ["auth-service-tests"]
 * @spec: Authentication service with login, register, token validation
 * @skills: ["<your-language>", "<crypto-library>", "<auth-library>"]
 */
interface AuthService {
  login(email: string, password: string): Promise<{ token: string; user: User }>;
  register(email: string, password: string): Promise<User>;
  validateToken(token: string): Promise<User | null>;
}

/**
 * @id: token-service
 * @priority: high
 * @progress: 0
 * @tests: ["token-service-tests"]
 * @spec: JWT token generation and validation
 * @skills: ["<your-language>", "<auth-library>"]
 */
interface TokenService {
  generate(userId: string): string;
  verify(token: string): { userId: string } | null;
}

/**
 * @id: user-api-routes
 * @priority: high
 * @progress: 0
 * @deps: ["auth-service", "user-repository"]
 * @tests: ["user-api-tests"]
 * @spec: REST API routes for user management (GET, POST, PUT, DELETE)
 * @skills: ["<your-language>", "express"]
 */

// Test holes
/**
 * @id: user-repository-tests
 * @priority: high
 * @progress: 0
 * @deps: ["user-repository"]
 * @spec: Tests for UserRepository CRUD operations
 * @skills: ["<your-language>", "<your-test-framework>"]
 */

/**
 * @id: auth-service-tests
 * @priority: high
 * @progress: 0
 * @deps: ["auth-service"]
 * @spec: Tests for AuthService login, register, token validation
 * @skills: ["<your-language>", "<your-test-framework>"]
 */

/**
 * @id: token-service-tests
 * @priority: high
 * @progress: 0
 * @deps: ["token-service"]
 * @spec: Tests for TokenService generation and verification
 * @skills: ["<your-language>", "<your-test-framework>"]
 */

/**
 * @id: user-api-tests
 * @priority: high
 * @progress: 0
 * @deps: ["user-api-routes"]
 * @spec: Integration tests for user API endpoints
 * @skills: ["<your-language>", "<your-test-framework>", "supertest"]
 */
```

#### Step 2: Find Next Task (`/incode-next`)

```bash
$ incode scan --ready

## user-model
**Priority:** 🔴 high
**Progress:** ░░░░░░░░░░ 0%
**Description:** User data model
**Skills:** typescript

## token-service
**Priority:** 🔴 high
**Progress:** ░░░░░░░░░░ 0%
**Description:** JWT token generation and validation
**Skills:** typescript, jwt
```

Agent decides: "I'll implement `user-model` first since other components depend on it."

#### Step 3: Implement (`/incode-implement user-model`)

```typescript
/**
 * @id: user-model
 * @priority: high
 * @progress: 100
 * @spec: User data model with id, email, passwordHash, createdAt, updatedAt
 * @skills: ["<your-language>"]
 */
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  passwordHash: string;
}

export interface UpdateUserDto {
  email?: string;
  passwordHash?: string;
}
```

Progress updated: `0 → 100` (no tests needed for data model)

#### Step 4: Continue with Next Task (`/incode-next`)

```bash
$ incode scan --ready

## token-service
**Priority:** 🔴 high
**Progress:** ░░░░░░░░░░ 0%
**Description:** JWT token generation and validation
**Skills:** typescript, jwt

## user-repository
**Priority:** 🔴 high
**Progress:** ░░░░░░░░░░ 0%
**Dependencies:** user-model (✅ 100%), database-connection (⚠️ not found)
**Description:** Repository for user CRUD operations
**Skills:** typescript, drizzle-orm
```

Agent decides: "I'll implement `token-service` since `user-repository` is blocked by missing `database-connection`."

#### Step 5: Implement with Tests (`/incode-implement token-service`)

```typescript
import jwt from 'jsonwebtoken';

/**
 * @id: token-service
 * @priority: high
 * @progress: 95
 * @tests: ["token-service-tests"]
 * @spec: JWT token generation and validation
 * @skills: ["<your-language>", "<auth-library>"]
 */
export class TokenService {
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
```

Progress updated: `0 → 95` (production-ready, tests pending)

#### Step 6: Validate and Test (`/incode-validate token-service`)

Agent checks:
- ✅ Spec requirements met (generate with 24h expiry, verify returns userId)
- ✅ Edge cases handled (invalid tokens, expired tokens)
- ⚠️ Tests not implemented yet

Agent implements tests:

```typescript
/**
 * @id: token-service-tests
 * @priority: high
 * @progress: 100
 * @deps: ["token-service"]
 * @spec: Tests for TokenService generation and verification
 * @skills: ["<your-language>", "<your-test-framework>"]
 */
import { describe, it, expect } from 'vitest';
import { TokenService } from './token-service';

describe('TokenService', () => {
  const service = new TokenService('test-secret');

  it('should generate valid token', () => {
    const token = service.generate('user-123');
    expect(token).toBeTruthy();
  });

  it('should verify valid token', () => {
    const token = service.generate('user-n    const result = service.verify(token);
    expect(result).toEqual({ userId: 'user-123' });
  });

  it('should return null for invalid token', () => {
    const result = service.verify('invalid-token');
    expect(result).toBeNull();
  });

  it('should return null for expired token', () => {
    const expiredToken = jwt.sign(
      { userId: 'user-123' },
      'test-secret',
      { expiresIn: '-1h' }
    );
    const result = service.verify(expiredToken);
    expect(result).toBeNull();
  });
});
```

Progress updated: `token-service: 95 → 100`, `token-service-tests: 0 → 100`

#### Step 7: Check Status (`/incode)

```
📊 Incode Project Status
========================

Overall Progress:
  Total Components: 9
  🕳️  Holes (0%): 5
  ✔️  Complete (100%): 2

Priority Breakdown:
  🔴 High Priority: 9 items
     - 5 holes
     - 2 complete

Ready to Implement:
  ✅ auth-service (waiting for: user-repository)
  ⚠️  user-repository (blocked by: database-connection)

Next Steps:
  1. Create database-connection hole
  2. Implement user-repository
  3. Implement auth-service
```

Agent continues this cycle until all holes are filled.

## Key Principles for Agents

### 1. Always Start with Architecture
```
❌ BAD: User asks for → Agent implements directly
✅ GOOD: User asks for feature → Agent uses /incode-start → Creates holes → Implements
```

### 2. Respect Dependencies
```
❌ BAD: Implement auth-service while user-repository is at 0%
✅ GOOD: Implement user-repository first, then auth-service
```

### 3. Honest Progress Tracking
```
❌ BAD: Mark @progress: 100 with stub implementations still present
✅ GOOD: Mark @progress: 50 (basic implementation, incomplete)
```

### 4. Use Available Skills Only
```
❌ BAD: @skills: ["magic-orm"] (doesn't exist in toolkit)
✅ GOOD: @skills: ["drizzle-orm"] (exists in toolkit)
```

### 5. Tests for Business Logic
```
❌ BAD: Write tests for User interface
✅ GOOD: Write tests for AuthService (business logic)
```

## Troubleshooting

### Problem: Agent implements without creating holes
**Solution:** Remind agent to use `/incode-start` first

### Problem: Agent marks progress too optimistically
**Solution:** Use `/incode-validate` to verify implementation

### Problem: Agent creates circular dependencies
**Solution:** Incode validation will warn about broken references

### Problem: Agent forgets to implement tests
**Solution:** `/incode-validate` checks if tests exist when `@tests` is specified

### Problem: Agent uses non-existent skills
**Solution:** Agent should only reference skills visible in toolkit

## Success Metrics

A successful Incode session results in:
- ✅ All components have metadata
- ✅ All holes are filled (progress > 0)
- ✅ Production-ready code (progress >= 95)
- ✅ Tests for business logic (progress = 100)
- ✅ No validation warnings
- ✅ All dependencies satisfied

## Comparison with Other Approaches

### vs. Spec-Driven Development (SDD)
| SDD | Incode |
|-----|--------|
| Specs in separate files | Specs in code comments |
| Context switching | Everything in one place |
| Specs get out of sync | Specs stay with code |
| External task tracking | Embedded progress tracking |

### vs. Configuration-Driven Development
| Config-Driven | Incode |
|---------------|--------|
| Limited to config schema | Flexible metadata |
| Abstract from implementation | Close to implementation |
| Hard to express complex logic | Natural code structure |
| Config files separate | Metadata embedded |

### Incode Advantages
- ✅ No context switching (metadata with code)
- ✅ No sync issues (specs can't get outdated)
- ✅ AI agents see progress while coding
- ✅ Flexible (not limited to config)
- ✅ Works with any language/framework
- ✅ Dependency tracking built-in
- ✅ Test coverage tracking built-in

---

**Ready for production-grade AI-driven development** 🚀

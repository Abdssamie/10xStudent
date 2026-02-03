---
description: Guide the agent to create architecture holes (interfaces, types, function signatures) for a new feature before implementation.
---

## When to Use
- Starting a new feature from scratch
- User requests: "implement X", "add Y feature", "build Z"
- Before writing any business logic

## Workflow

### Step 1: Understand the Feature
Ask clarifying questions if needed:
- What is the core functionality?
- What are the main components/modules?
- What are the dependencies?
- What skills/technologies are involved?

### Step 2: Design Architecture
Identify the key components:
- **Data models/types** - What data structures are needed?
- **Interfaces** - What contracts need to be defined?
- **Services/Classes** - What business logic components?
- **Functions** - What utility functions?

### Step 3: Create Holes
For each component, create a metadata block with:
- `@id` - kebab-case identifier (e.g., `user-repository`, `auth-service`)
- `@priority` - high/medium/low based on importance
- `@progress: 0` - Mark as hole (unimplemented)
- `@deps` - List dependencies (other component IDs)
- `@tests` - Reference test block IDs (if tests are needed)
- `@spec` - Clear description of what needs to be implemented
- `@skills` - List skills from your toolkit that will be used (e.g., `["drizzle-orm", "<your-test-framework>", "typescript"]`)

### Step 4: Create Test Holes (If Applicable)
For business logic components, create corresponding test holes:
- Use ID format: `{component-id}-tests`
- Mark with `@progress: 0`
- Add `@deps: ["{component-id}"]`

### Step 5: Verify Architecture
Run validation:
```bash
incode scan --holes
```

Check:
- All holes have kebab-case IDs
- Dependencies reference existing IDs
- Test references are correct
- Skills are from your available toolkit

## Example

User request: "Add user authentication"

### Step 1: Identify Components
- User model
- Auth service
- Token validator
- Auth repository

### Step 2: Create Holes

**TypeScript Example:**
```typescript
/**
 * @id: user-model
 * @priority: high
 * @progress: 0
 * @spec: User data model with id, email, password hash, created/updated timestamps
 * @skills: ["<your-language>"]
 */
interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Python Example:**
```python
# @id: user-model
# @priority: high
# @progress: 0
# @spec: User data model with id, email, password hash, created/updated timestamps
# @skills: ["python", "pydantic"]
class User:
    id: str
    email: str
    password_hash: str
    created_at: datetime
    updated_at: datetime
```

**C# Example:**
```csharp
/// <summary>
/// @id: user-model
/// @priority: high
/// @progress: 0
/// @spec: User data model with id, email, password hash, created/updated timestamps
/// @skills: ["csharp"]
/// </summary>
public class User
{
    public string Id { get; set; }
    public string Email { get; set; }
    public string PasswordHash { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

**Repository Example (Language-Agnostic):**
```
/**
 * @id: auth-repository
 * @priority: high
 * @progress: 0
 * @deps: ["user-model", "database-connection"]
 * @tests: ["auth-repository-tests"]
 * @spec: Repository for user authentication. Methods: findByEmail, createUser, updatePassword
 * @skills: ["<your-language>", "<your-orm>"]
 */
```

**Service Example (Language-Agnostic):**
```
/**
 * @id: auth-service
 * @priority: high
 * @progress: 0
 * @deps: ["auth-repository", "token-validator"]
 * @tests: ["auth-service-tests"]
 * @spec: Authentication service. Methods: login, register, validateToken, refreshToken
 * @skills: ["<your-language>", "<auth-library>"]
 */
```

**Test Holes (Language-Agnostic):**
**Test Holes (Language-Agnostic):**
```
/**
 * @id: auth-repository-tests
 * @priority: high
 * @progress: 0
 * @deps: ["auth-repository"]
 * @spec: Tests for AuthRepository - test all CRUD operations
 * @skills: ["<your-language>", "<your-test-framework>"]
 */

/**
 * @id: auth-service-tests
 * @priority: high
 * @progress: 0
 * @deps: ["auth-service"]
 * @spec: Tests for AuthService - test login, register, token validation
 * @skills: ["<your-language>", "<your-test-framework>"]
 */

/**
 * @id: token-validator-tests
 * @priority: high
 * @progress: 0
 * @deps: ["token-validator"]
 * @spec: Tests for TokenValidator - test token generation and verification
 * @skills: ["<your-language>", "<your-test-framework>"]
 */
```

### Step 3: Verify
```bash
incode scan --holes
# Should show all holes ready to be implemented
```

## Important Rules

1. **Always create holes first** - Never implement directly
2. **Use kebab-case IDs** - `user-service`, not `UserService` or `user_service`
3. **Reference existing IDs** - All `@deps` and `@tests` must reference valid IDs
4. **Only use available skills** - Check your toolkit, don't hallucinate skills
5. **Tests for business logic only** - Data models/interfaces don't need tests
6. **Clear specs** - Write detailed `@spec` describing what needs to be implemented
7. **Stubs are acceptable** - For compiled languages, use stub implementations (e.g., throwing not-implemented errors) if needed to satisfy the compiler
8. **LSP errors are expected** - Holes may cause LSP/compiler errors until implemented
9. **Generated code** - For ORM/Protobuf/GraphQL generated code, create empty files with only metadata comments

## Next Steps

After creating holes, use:
- `/incode-next` - Find what to implement first
- `/incode-implement <id>` - Start implementing a specific hole

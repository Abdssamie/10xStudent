# Incode FAQ

## Holes-Driven Development

### Q: What if my language requires implementations to compile?

**A:** Use stub implementations that satisfy the compiler while marking the component as `@progress: 0`. The stub indicates this is still a "hole" conceptually.

**Example pattern (adapt to your language):**
```
/**
 * @id: user-repository
 * @progress: 0
 * @spec: Repository for user CRUD operations
 */
class UserRepository implements IUserRepository {
    // Stub implementation - satisfies compiler but indicates incomplete work
    // In your language, this might be: throw NotImplementedException, 
    // return null, panic!(), raise NotImplementedError, etc.
}
```

**Important:** The specific error/exception syntax depends on your language. Use whatever is idiomatic.

### Q: What about LSP/compiler errors in holes?

**A:** LSP errors are expected and acceptable for holes. Agents should understand this is intentional and ignore them. The errors will resolve once the hole is implemented.

### Q: How do I handle generated code (ORMs, Protobuf, etc.)?

**A:** Create empty files with only metadata comments, no code at all:

```typescript
// user.schema.ts (empty file, just metadata)
/**
 * @id: user-schema
 * @progress: 0
 * @spec: Drizzle schema for users table. Will be generated after implementation.
 * @skills: ["drizzle-orm"]
 */
```

### Q: Can I have circular dependencies?

**A:** Avoid them if possible. If unavoidable, one component must be implemented first with a temporary stub for the other. Update `@deps` to reflect the actual dependency order.

### Q: What if a hole is too large to implement at once?

**A:** Break it into smaller holes. Create sub-components with their own IDs and dependencies.

**Example:**
```
auth-service (progress: 0)
  ├── auth-service-login (progress: 0)
  ├── auth-service-register (progress: 0)
  └── auth-service-validate (progress: 0)
```

### Q: Should every function have metadata?

**A:** No. Only create metadata for:
- Architectural components (classes, modules, services)
- Public APIs
- Complex business logic
- Components that need tracking

Don't add metadata to every helper function or trivial code.

### Q: What about monorepos with shared packages?

**A:** Treat each package as a separate codebase. Shared types/interfaces should be implemented first (they're dependencies for other packages).

### Q: Can I use Incode with existing codebases?

**A:** Yes! Add metadata to existing code:
- Mark complete code as `@progress: 100`
- Mark incomplete code with appropriate progress
- Add `@deps` and `@tests` to track relationships

### Q: What if I find a bug in "complete" code?

**A:** Lower the `@progress` to reflect reality. If it's at 100 and has a bug, it's not really complete. Lower to 90 or 95, fix the bug, then restore to 100.

### Q: How detailed should `@spec` be?

**A:** As detailed as needed. For simple components, one line is fine. For complex features, write multiple lines with:
- What it does
- Key requirements
- Edge cases to handle
- Constraints

Incode supports multiline specs - the parser concatenates them.

### Q: Do I need tests for everything?

**A:** No. Tests are needed for:
- ✅ Business logic
- ✅ Complex algorithms
- ✅ Security-critical code
- ✅ Public APIs

Tests are NOT needed for:
- ❌ Data models/types
- ❌ Simple interfaces
- ❌ Configuration
- ❌ Trivial getters/setters

---

**More questions?** Open an issue on GitHub or check the documentation.

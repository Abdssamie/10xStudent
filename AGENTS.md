# Agent Instructions for 10xStudent

## 🚨 CRITICAL: USE SUPERPOWERS AND SKILLS! 🚨

**BEFORE DOING ANYTHING - READ THIS:**

This project has **superpowers skills** in `.opencode/skills/` that make your life EASIER and your work BETTER.

### ⚡ Available Skills (USE THEM!)

**ALWAYS check for relevant skills BEFORE implementing:**

- **clerk-webhooks** - Clerk webhook signature verification patterns
- **clerk-setup** - Clerk authentication setup
- **hono-api-patterns** - Hono API routes, middleware, validation (USE THIS FOR API WORK!)
- **drizzle-orm** - Drizzle ORM patterns and best practices
- **pgvector-drizzle** - Vector embeddings with pgvector
- **bullmq-redis** - Background job processing
- **tanstack-ai** - TanStack AI integration patterns
- **react-zustand-tanstack-query** - React state management
- **rag-citations** - Citation formatting for RAG systems
- **typst-wasm-codemirror** - Typst document compilation
- **pino-hono** - Structured logging with Hono

**HOW TO USE SKILLS:**
```typescript
// Load a skill BEFORE implementing anything related to it
skill("hono-api-patterns")  // For API routes
skill("clerk-webhooks")     // For webhooks
skill("drizzle-orm")        // For database queries
```

**🔥 USE SKILLS = FASTER + BETTER + CORRECT CODE 🔥**

---

## 🎯 Superpowers Workflow (MANDATORY)

**When starting ANY task, follow this workflow:**

1. **Check for relevant skills** - Search `.opencode/skills/` for applicable skills
2. **Load specific skills** - Use `skill("skill-name")` before implementing
3. **Follow skill patterns** - Implement according to skill guidelines
4. **Use superpowers as needed:**
   - `brainstorming` - BEFORE creating features
   - `writing-plans` - BEFORE multi-step tasks
   - `executing-plans` - WHEN executing plans
   - `using-git-worktrees` - BEFORE starting work
   - `verification-before-completion` - BEFORE claiming complete
   - `finishing-a-development-branch` - AFTER work complete

**🚨 NEVER skip checking for skills - they save time and prevent mistakes! 🚨**

---

## 🆘 When Tasks Are Too Hard

**If you encounter a difficult task or unfamiliar technology:**

### Option 1: Use Context7 MCP Tool
```typescript
// Query official documentation for any library
context7_resolve-library-id({ libraryName: "hono", query: "middleware patterns" })
context7_query-docs({ libraryId: "/honojs/hono", query: "how to create middleware" })
```

**Use Context7 for:**
- Official documentation lookup
- API reference queries
- Best practices from library maintainers
- Up-to-date patterns and examples

### Option 2: Create a New Skill
```bash
# If a pattern will be reused, create a skill!
skill("writing-skills")  # Load skill creation guide
# Then create skill in .encode/skills/[skill-name]/SKILL.md
```

**Create skills for:**
- Patterns you'll use multiple times
- Complex workflows that need documentation
- Team knowledge that should be preserved
- Integration patterns with third-party services

**🚨 DON'T struggle alone - use Context7 or create a skill! 🚨**

---

## Build & Development Commands

```bash
# Development
bun dev                    # Start all apps in watch mode
turbo dev --filter=api     # Backend API only
turbo dev --filter=web     # Frontend only

# Build
bun run build              # Build all apps and packages
turbo build --filter=api   # Build specific app

# Linting & Type Checking
bun run lint               # Lint all packages
bun run check-types        # Type check all packages

# Formatting
bun run format             # Format all files with Prettier

# Database (from packages/database/)
cd packages/database
bun run generate           # Generate Drizzle migrations
bun run migrate            # Run migrations
bun run studio             # Open Drizzle Studio

# Docker Services
docker-compose up -d       # Start all services
docker-compose logs -f     # View logs
```

## Testing

**Tests are OPTIONAL** unless explicitly required. When tests exist:

```bash
# No test runner configured yet - add vitest when needed
# bun test                 # Run all tests
# bun test path/to/test    # Run single test file
```

---

## Code Style Guidelines

### Import Order

```typescript
// 1. External dependencies
import { Hono } from "hono";
import { z } from "zod";

// 2. Internal packages (monorepo)
import { db, schema } from "@10xstudent/database";

// 3. Relative imports
import { authMiddleware } from "../middleware/auth";
```

### TypeScript Standards

```typescript
// ✅ Use interfaces for object shapes
export interface User {
  id: string;
  email: string;
}

// ✅ Always define return types
export async function getUser(id: string): Promise<User | null> {
  return await db.query.users.findFirst({ where: eq(schema.users.id, id) });
}

// ✅ Use Zod for runtime validation
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

// ❌ Never use 'any' (except for untyped third-party libs - document why)
// ❌ Never use 'as' type assertions (use type guards instead)
```

### Naming Conventions

```typescript
// Variables & functions: camelCase
const userId = "user_123";
function getUserById(id: string) {}

// Interfaces & Types: PascalCase
interface UserPreferences {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;

// Files: kebab-case (user-service.ts, auth-middleware.ts)
// React Components: PascalCase files (UserProfile.tsx)
```

### Error Handling

```typescript
// ✅ API Routes: Return structured errors
app.get("/users/:id", async (c) => {
  const user = await getUser(c.req.param("id"));
  if (!user) return c.json({ error: "User not found" }, 404);
  return c.json(user);
});

// ✅ Always handle async errors
try {
  await riskyOperation();
} catch (error) {
  console.error("Operation failed:", error);
  throw new Error("Failed to complete operation");
}
```

---

## Session Completion Workflow

**MANDATORY when ending a session:**

1. **Use `verification-before-completion` skill** - Verify all tests pass
2. Run quality gates: `bun run lint && bun run check-types && bun run build`
3. Commit all changes with descriptive messages
4. **PUSH TO REMOTE** (CRITICAL):
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Use `finishing-a-development-branch` skill** - Complete the work properly

**Work is NOT complete until `git push` succeeds.**

---

## 🔥 FINAL REMINDER: USE SKILLS! 🔥

**Skills are NOT optional - they are REQUIRED for quality work!**

- ✅ **DO**: Load relevant skills before implementing
- ✅ **DO**: Follow skill patterns and guidelines
- ✅ **DO**: Use superpowers workflow for all tasks
- ✅ **DO**: Use Context7 for unfamiliar libraries
- ✅ **DO**: Create skills for reusable patterns
- ❌ **DON'T**: Implement without checking for skills
- ❌ **DON'T**: Guess patterns when skills exist
- ❌ **DON'T**: Struggle with hard tasks - use Context7 or create a skill!

**Skills location:** `.oplls/`
**Load skills with:** `skill("skill-name")`

**🚨 ALWAYS CHECK FOR SKILLS FIRST! 🚨**

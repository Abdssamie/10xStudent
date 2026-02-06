# Agent Instructions for 10xStudent

## Project Constitution

**CRITICAL**: This project follows a strict constitution (`.specify/memory/constitution.md`). All code changes MUST comply with these principles:

1. **Monorepo Organization**: Apps in `apps/`, packages in `packages/`. Apps depend on packages, never reverse.
2. **Type Safety & Validation**: TypeScript strict mode + Zod schemas in `@10xstudent/domain` for all data shapes.
3. **Shared Domain Logic**: Business logic lives in `@10xstudent/domain` package only. No duplication across apps.
4. **API-First Design**: Document API contracts in `specs/[feature]/contracts/` before implementation.
5. **Database Integrity**: All schema changes via Drizzle migrations. No direct DB modifications.

**Violations require explicit justification in implementation plans.**

## Build & Development Commands

```bash
# Development (all apps)
bun dev                    # Start all apps in watch mode
turbo dev                  # Alternative using turbo directly

# Development (specific app)
turbo dev --filter=web     # Frontend only
turbo dev --filter=api     # Backend API only
turbo dev --filter=docs    # Docs site only

# Build
bun run build              # Build all apps and packages
turbo build --filter=web   # Build specific app

# Linting & Type Checking
bun run lint               # Lint all packages
bun run check-types        # Type check all packages
turbo lint --filter=api    # Lint specific package

# Formatting
bun run format             # Format all files with Prettier

#from packages/database/)
cd packages/database
bun run generate           # Generate Drizzle migrations
bun run migrate            # Run migrations
bun run push               # Push schema changes (dev only)
bun run studio             # Open Drizzle Studio
```

## Testing

**Tests are OPTIONAL** unless explicitly required in feature specs. When tests are needed:

```bash
# No test runner configured yet - add when needed
# Recommended: vitest for unit/integration tests
```

## Code Style Guidelines

### Import Order

```typescript
// 1. External dependencies
import { Hono } from "hono";
import { z } from "zod";

// 2. Internal packages (monorepo)
import { db, schema } from "@10xstudent/database";
import { User } from "@10xstudent/domain";

// 3. Relative imports
import { authMiddleware } from "../middleware/auth";
import type { AppContext } from "./types";
```

### TypeScript Standards

```typescript
// ✅ Use interfaces for object shapes
export interface User {
  id: string;
  email: string;
  preferences: UserPreferences;
}

// ✅ Use type for unions, intersections, utilities
export type Theme = "light" | "dark" | "system";
export type UserWithProjects = User & { projects: Project[] };

// ✅ Always define return types for functions
export async function getUser(id: string): Promise<User | null> {
  return await db.query.users.findFirst({ where: eq(schema.users.id, id) });
}

// ✅ Use Zod for runtime validation
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

// ✅ Infer types from Zod schemas
type CreateUserInput = z.infer<typeof createUserSchema>;

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
type ApiResponse<T> = { data: T };

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const API_BASE_URL = process.env.API_URL;

// Files: kebab-case
// user-service.ts, auth-middleware.ts, project-router.ts

// React Components: PascalCase files
// UserProfile.tsx, ProjectCard.tsx
```

### Error Handling

```typescript
// ✅ API Routes: Return structured errors
app.get("/users/:id", async (c) => {
  const user = await getUser(c.req.param("id"));
  if (!user) return c.json({ error: "User not found" }, 404);
  return c.json(user);
});

// ✅ Services: Throw typed errors
class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} ${id} not found`);
    this.name = "NotFoundError";
  }
}

// ✅ Always handle async errors
try {
  await riskyOperation();
} catch (error) {
  console.error("Operation failed:", error);
  throw new Error("Failed to complete operation");
}
```

### Hono API Patterns

```typescript
// ✅ Use Zod validator middleware
import { zValidator } from "@hono/zod-validator";

app.post("/projects", zValidator("json", createProjectSchema), async (c) => {
  const data = c.req.valid("json"); // Typed automatically
  // ...
});

// ✅ Use context variables for auth
declare module "hono" {
  interface ContextVariableMap {
    auth: { userId: string; sessionId: string };
  }
}

// ✅ Check auth in protected routes
const auth = c.get("auth");
if (!auth) return c.json({ error: "Unauthorized" }, 401);
```

### Drizzle ORM Patterns

```typescript
// ✅ Import from @10xstudent/database
import { db, schema, eq, and, desc } from "@10xstudent/database";

// ✅ Use query builder (preferred)
const users = await db.query.users.findMany({
  where: eq(schema.users.active, true),
  orderBy: [desc(schema.users.createdAt)],
});

// ✅ Use with for relations
const project = await db.query.projects.findFirst({
  where: eq(schema.projects.id, projectId),
  with: { documents: true },
});

// ✅ Use transactions for multi-step operations
await db.transaction(async (tx) => {
  await tx.insert(schema.users).values(userData);
  await tx.insert(schema.projects).values(projectData);
});
```

### React/Next.js Patterns

```typescript
// ✅ Use 'use client' only when needed
'use client';

// ✅ Import from @/ alias for app code
import { Button } from '@/components/ui/button';

// ✅ Type component props
interface ButtonProps {
    variant?: 'primary' | 'secondary';
    onClick: () => void;
}

export function Button({ variant = 'primary', onClick }: ButtonProps) {
    // ...
}

// ✅ Use async Server Components
export default async function ProjectPage({ params }: { params: { id: string } }) {
    const project = await fetchProject(params.id);
    return <ProjectView project={project} />;
}
```

## Session Completion Workflow

**MANDATORY when ending a session:**

1. Run quality gates: `bun run lint && bun run check-types && bun run build`
2. Commit all changes with descriptive messages
3. **PUSH TO REMOTE** (CRITICAL):
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
4. Clean up stashes and branches
5. Verify all changes committed AND pushed
6. Provide context for next session

**Work is NOT complete until `git push` succeeds.**

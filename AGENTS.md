# Agent Instructions for 10xStudent

## Project Structure

```
10xStudent/
├── web/                    # Next.js frontend (standalone)
├── api/                    # Hono API + Drizzle (standalone)
│   └── src/database/       # Drizzle ORM (inlined)
├── shared/                 # Zod types/schemas (shared between apps)
├── docs/                   # Documentation
└── docker-compose.yml      # Database services
```

**Path Aliases:**
- `@/*` → `./src/*` (in api)
- `@shared` → `../shared` (in api)

---

## Build & Development Commands

```bash
# Web (Next.js)
cd web && bun install
bun run dev                # Dev server on port 3000
bun run build              # Production build
bun run lint               # ESLint
npx tsc --noEmit           # Type check

# API (Hono + Bun)
cd api && bun install
bun run dev                # Dev server with watch mode
bun run build              # Build for production
bun run test               # Run vitest tests
npx tsc --noEmit           # Type check

# Database (from api/)
bun run db:generate        # Generate Drizzle migrations
bun run db:migrate         # Run migrations
bun run db:push            # Push schema changes
bun run db:studio          # Open Drizzle Studio

# Docker Services
docker-compose up -d       # Start PostgreSQL + Redis
```

---

## Code Style Guidelines

### Import Order

```typescript
// 1. External dependencies
import { Hono } from "hono";
import { z } from "zod";

// 2. Shared types (using path alias)
import { Document, Source } from "@shared";

// 3. Internal modules (using path alias)
import { db, schema } from "@/database";

// 4. Relative imports
import { authMiddleware } from "../middleware/auth";
```

### TypeScript Standards

- **Never use `any`** - use proper typing
- Use interfaces for object shapes
- Always define return types
- Use Zod for runtime validation

---

## Available Skills

Skills are in `.opencode/skills/`:

- **hono-api-patterns** - Hono routes, middleware, validation
- **drizzle-orm** - Drizzle ORM patterns
- **clerk-webhooks** - Clerk webhook verification
- **tanstack-ai** - TanStack AI integration
- **typst-wasm-codemirror** - Typst document compilation

---

## Pre-existing Issues

The following issues exist in the codebase:

- Missing `add-source.ts` module (referenced but not created)
- 12 type errors in `api/src/` files (schema mismatches, etc.)

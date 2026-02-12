# Agent Instructions for 10xStudent

## Project Overview

AI-powered research platform: Next.js 16 + Hono API + Bun + Drizzle ORM + PostgreSQL (pgvector) + Redis + Clerk Auth

**Structure:** `web/` (Next.js), `api/` (Hono), `shared/` (Zod schemas), `docker-compose.yml` (services)
**Path Aliases:** API: `@/*` → `./src/*`, `@shared` → `../shared` | Web: `@/*` → `./src/*`

---

## Commands

**Package Manager:** Always use `bun` (never npm/yarn/pnpm)

```bash
# Web (Next.js on port 3000)
cd web && bun install && bun run dev
bun run build && bun run check-types

# API (Hono on port 3001)
cd api && bun install && bun run dev
bun run build && bun run typecheck
bun run test              # All tests
bun run test -- bibtex    # Single test (pattern match)

# Database (from api/)
bun run db:generate       # Generate migrations from schema
bun run db:migrate        # Apply migrations (production)
bun run db:push           # Direct sync (dev only, no migration files)
bun run db:studio         # Open Drizzle Studio

# Docker
docker compose up -d      # Start PostgreSQL (5440) + Redis (6380)
```

---

## Code Style

### Import Order (Strict)
```typescript
// 1. External (alphabetical)
import { Hono } from "hono";
import { z } from "zod";
// 2. Shared
import { Document } from "@shared";
// 3. Internal
import { db, schema } from "@/database";
import { env } from "@/config/env";
// 4. Relative
import { authMiddleware } from "./middleware/auth";
```

### TypeScript
- `strict: true`, `noUncheckedIndexedAccess: true`
- Never use `any` - use `unknown` or proper types
- Always explicit return types
- `type` for unions/primitives, `interface` for objects

### Environment Variables
**CRITICAL:** Only applies to api project. Never use `process.env` directly. Always import from `@/config/env`:
```typescript
// ✅ Good
import { env } from "@/config/env";
const key = env.GOOGLE_API_KEY;

// ❌ Bad
const key = process.env.GOOGLE_API_KEY;
```

### Naming
- Files: `kebab-case.ts`
- Components: `PascalCase.tsx`
- Functions: `camelCase()`
- Constants: `UPPER_SNAKE_CASE`
- Types: `PascalCase`

### Error Handling
```typescript
// API routes - return JSON
return c.json({ error: 'Message', message: error.message }, 500);

// Services - throw typed errors
throw new ValidationError('Invalid input');
```

---

## Authentication (Clerk)

**Web:** `@clerk/nextjs@6.37.3`, `proxy.ts` with `clerkMiddleware()`, `<ClerkProvider>` in layout
**API:** `@clerk/clerk-sdk-node@5.1.6`, JWT verification in `src/middleware/auth.ts`
**Flow:** Frontend → `Authorization: Bearer <token>` → API verifies → `c.get('auth').userId`

---

## Critical Rules

1. **Package Manager:** Always `bun`, never npm/yarn/pnpm
2. **Environment:** Import from `@/config/env`, never `process.env` directly
3. **Types:** Strict mode, no `any`, explicit return types
4. **Imports:** Follow order (external → shared → internal → relative)
5. **Naming:** kebab-case files, PascalCase components/types, camelCase functions
6. **Auth:** Use `c.get('auth')` in protected routes
7. **Database:** Drizzle ORM only, never raw SQL without parameterization
8. **Validation:** Zod schemas for all input
9. **Testing:** Vitest with `describe`/`it`/`expect`
10. **Documentation:** NEVER create .md files (README, CHANGELOG, docs/, etc.) unless explicitly requested by user

---

## Common Patterns

### API Route (Hono)
```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, schema } from "@/database";
import { authMiddleware } from "@/middleware/auth";

export const router = new Hono();
const inputSchema = z.object({ title: z.string().min(1) });

router.post("/", authMiddleware, zValidator("json", inputSchema), async (c) => {
  const { userId } = c.get("auth");
  const data = c.req.valid("json");
  const result = await db.insert(schema.documents).values({ ...data, userId }).returning();
  return c.json({ success: true, data: result[0] });
});
```

---

## Troubleshooting

**Type errors:** `bun run typecheck`, check `@/config/env.ts`, verify schema matches DB
**Build fails:** `rm -rf .next && bun install`, check circular deps
**Auth issues:** Verify Clerk keys in both `.env` files, check CORS, ensure `proxy.ts` exists
**Database:** `docker compose up -d`, verify `DATABASE_URL` matches in root and `api/.env`
**Migrations:** Use `bun run db:push` in dev, check tables with `docker exec 10xstudent-postgres psql -U abdssamie -d 10xstudent -c "\dt"`

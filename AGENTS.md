# Agent Instructions for 10xStudent

## Project Overview

AI-powered research platform: Next.js 16 + Hono API + Bun + Drizzle ORM + PostgreSQL (pgvector) + Redis + Clerk Auth

**Structure:** `web/` (Next.js), `api/` (Hono), `shared/` (Zod schemas)
**Path Aliases:** API: `@/*` → `./src/*`, `@shared` → `../shared` | Web: `@/*` → `./src/*`

**Status:** This project is in active development. There are no existing clients. Do not add redirects or backwards compatibility for removed features - just delete them.

## Commands

**Package Manager:** Always use `bun` (never npm/yarn/pnpm)

```bash
# Web (Next.js on port 3000)
cd web && bun run dev

# API (Hono on port 3001)
cd api && bun run dev

# Database (from api/)
bun run db:generate && bun run db:push
bun run db:studio

# Docker
docker compose up -d

# Tests
bun run test -- --run
```

## Critical Rules

1. **Package Manager:** Always `bun`, never npm/yarn/pnpm
2. **Environment (API):** Import from `@/config/env`, never `process.env`
3. **Logging (API):** Import from `@/utils/logger`, never `console.*`
4. **Errors (API):** Throw from `@/errors`, never generic `Error` or direct JSON
5. **Types:** Strict mode, no `any`, explicit return types
6. **Imports:** Follow order (external → shared → internal → relative)
7. **Auth:** Use `c.get('auth')` in protected routes
8. **Database:** Drizzle ORM only
9. **Validation:** Zod schemas for all input
10. **Array Access:** Always check for undefined: `arr[0]` returns `T | undefined`
11. **Shared Types (CRITICAL):** All API request/response schemas and domain types MUST be defined in `shared/` package. Never duplicate Zod schemas in `web/` or `api/`. Import from `@shared/src` instead.
12. **Type Consistency:** 
    - Use enums (e.g., `citationFormatSchema`) from shared for all validated values
    - Import inferred types (e.g., `type CreateDocumentInput`) from shared
    - Validate API responses in web hooks using shared schemas (e.g., `documentResponseSchema.parse(data)`)

## Troubleshooting

- **Type errors:** Run `bun run typecheck`
- **Build fails:** `rm -rf .next && bun install`
- **Auth issues:** Verify Clerk keys in `.env`, check CORS
- **Database:** `docker compose up -d`, verify `DATABASE_URL` in `api/.env`
- **Tests failing:** Ensure Docker is running

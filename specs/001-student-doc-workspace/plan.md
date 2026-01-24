# Implementation Plan: Student Document Workspace

**Branch**: `001-student-doc-workspace` | **Date**: Sat Jan 24 2026 | **Spec**: [specs/001-student-doc-workspace/spec.md](spec.md)
**Input**: Feature specification from `/specs/001-student-doc-workspace/spec.md`

## Summary

Build a student workspace app featuring a Resume Builder (using `rendercv`) and a General Document Builder (using Typst & AI). Features include live preview, AI assistant (OpenAI/Gemini), storage management (R2), and client-side plotting (Pyodide).

## Technical Context

**Language/Version**: TypeScript (Bun), Python (Plots/Resume), Typst
**Primary Dependencies**: Next.js, Hono, @hono/zod-openapi, Drizzle ORM, Clerk, Pyodide, RenderCV
**Storage**: PostgreSQL (Data), Cloudflare R2 (Files)
**Testing**: Vitest, Playwright
**Target Platform**: Web (Vercel/Docker), API (Docker)
**Project Type**: Monorepo (Turborepo)
**Performance Goals**: < 3s preview generation latency
**Constraints**: Low resource consumption, Cost-effective
**Scale/Scope**: Scalable for school-wide usage

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Simplicity**: Monorepo structure minimizes overhead.
- **Test-First**: Plan includes comprehensive testing strategy.
- **Performance**: Architecture choices (Pyodide, Debounce) align with performance goals.

## Project Structure

### Documentation (this feature)

```text
specs/001-student-doc-workspace/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/
├── web/                 # Next.js Frontend (Vercel)
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   └── next.config.js
└── api/                 # Hono Backend (Docker)
    ├── src/
    │   ├── routes/
    │   ├── services/
    │   └── utils/
    └── Dockerfile

packages/
├── db/                  # Drizzle ORM Schema & Client
├── auth/                # Clerk Integration
├── ui/                  # Shared UI Components
└── ts-config/           # Shared TypeScript Config

docker-compose.yml       # Local Dev & Services (Postgres, Typst, RenderCV)
```

**Structure Decision**: Monorepo with Turborepo. `apps/web` for frontend. `apps/api` will be **recreated** as a standalone Hono app (via `bun create hono`) replacing the existing Next.js API, integrating shared `packages/ts-config` and linting. `packages/` for shared code.

## Complexity Tracking

| Violation       | Why Needed                    | Simpler Alternative Rejected Because                                                                                            |
| --------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Docker Services | Typst & RenderCV dependencies | WASM might not support full feature set (RenderCV LaTeX) or performance (large docs) initially; user has existing Docker setup. |

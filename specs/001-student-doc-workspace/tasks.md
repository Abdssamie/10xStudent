# Tasks: Student Document Workspace

**Spec**: [specs/001-student-doc-workspace/spec.md](spec.md)
**Plan**: [specs/001-student-doc-workspace/plan.md](plan.md)
**Branch**: `001-student-doc-workspace`

## Dependencies

- **Phase 1 (Setup)**: Blocks Phase 2
- **Phase 2 (Foundational)**: Blocks Phase 3, 4, 5
- **Phase 3 (US1 - Resumes)**: Blocks Phase 6
- **Phase 4 (US2 - General Docs)**: Independent of US1
- **Phase 5 (US3 - Workspace)**: Depends on Phase 2
- **Phase 6 (Polish)**: Depends on all prior phases

## Phase 1: Setup

_Goal: Initialize project structure and core dependencies._

- [ ] T001 Initialize Hono API project structure in `apps/api` (replacing existing Next.js API)
- [ ] T002 Configure Turborepo for new `apps/api` and `apps/web`
- [ ] T003 Install core dependencies: `@hono/zod-openapi`, `drizzle-orm`, `@clerk/nextjs`, `pyodide`
- [ ] T004 Configure Docker Compose for Postgres and development services
- [ ] T005 [P] Setup shared packages structure: `packages/db`, `packages/auth`, `packages/ui`

## Phase 2: Foundational

_Goal: Core backend services, database schema, and authentication._

- [ ] T006 Initialize Drizzle ORM schema for `Student`, `ApiKey`, `Document`, `Resource` in `packages/db/schema.ts`
- [ ] T007 [P] Implement Clerk authentication middleware in `apps/api/src/middleware/auth.ts`
- [ ] T008 [P] Configure Cloudflare R2 (S3 compatible) client in `apps/api/src/services/storage.ts`
- [ ] T009 Create Zod schemas for OpenAPI contract definition in `packages/contract/src/index.ts` (shared)
- [ ] T010 Implement Health Check endpoint in `apps/api/src/routes/health.ts` using Hono OpenAPI

## Phase 3: User Story 1 - Create & Edit Resumes (Priority: P1)

_Goal: YAML-based resume editor with live preview._
_Independent Test: Create resume, edit YAML, verify preview updates._

- [ ] T011 [US1] Create Resume Data Model (YAML structure) validation schema in `packages/db/schema/resume.ts`
- [ ] T012 [P] [US1] Implement `POST /documents` (type=RESUME) endpoint in `apps/api/src/routes/documents.ts`
- [ ] T013 [P] [US1] Implement `PUT /documents/{id}` endpoint for resume updates in `apps/api/src/routes/documents.ts`
- [ ] T014 [US1] Create Resume Editor Page (Split View) in `apps/web/src/app/resume/page.tsx`
- [ ] T015 [US1] Implement YAML Code Editor component in `apps/web/src/components/editor/YamlEditor.tsx`
- [ ] T016 [US1] Implement Pyodide loader hook in `apps/web/src/hooks/usePyodide.ts`
- [ ] T017 [US1] Implement Client-side RenderCV logic (YAML -> Typst) using Pyodide in `apps/web/src/lib/rendercv.ts`
- [ ] T018 [US1] Implement Typst WASM Preview component in `apps/web/src/components/preview/TypstPreview.tsx`
- [ ] T019 [US1] Integrate Debounced Auto-Save and Preview Update in `apps/web/src/app/resume/page.tsx`

## Phase 4: User Story 2 - General Document Creation with AI (Priority: P1)

_Goal: Text/Image to Document generation using AI & Typst._
_Independent Test: Input text/images, generate doc, verify structure/plots._

- [ ] T020 [US2] Implement `POST /documents/generate` endpoint (AI Gateway) in `apps/api/src/routes/ai.ts`
- [ ] T021 [P] [US2] Implement OpenAI/Gemini Service adapter in `apps/api/src/services/ai.ts`
- [ ] T022 [US2] Create General Document Editor Page in `apps/web/src/app/document/page.tsx`
- [ ] T023 [US2] Implement Image Upload Component with Metadata inputs in `apps/web/src/components/upload/ImageUploader.tsx`
- [ ] T024 [P] [US2] Implement Plot Generation Service (Pyodide -> SVG) in `apps/web/src/services/plot.ts`
- [ ] T025 [US2] Integrate Plot SVG injection into Typst VFS in `apps/web/src/lib/typst-vfs.ts`
- [ ] T026 [US2] Implement AI Context Assembly (Text + Image Metadata) logic in `apps/api/src/services/prompt-builder.ts`

## Phase 5: User Story 3 - Workspace Management (Priority: P2)

_Goal: Manage documents, resources, and API keys._
_Independent Test: CRUD operations on docs/resources, key management._

- [ ] T027 [US3] Implement Dashboard Page listing documents in `apps/web/src/app/dashboard/page.tsx`
- [ ] T028 [P] [US3] Implement `GET /documents` (List) and `DELETE /documents/{id}` in `apps/api/src/routes/documents.ts`
- [ ] T029 [US3] Implement Resource Manager UI in `apps/web/src/components/workspace/ResourceManager.tsx`
- [ ] T030 [P] [US3] Implement `POST /resources/upload-url` (Presigned URLs) in `apps/api/src/routes/resources.ts`
- [ ] T031 [US3] Implement Settings Page for API Key management in `apps/web/src/app/settings/page.tsx`
- [ ] T032 [US3] Implement Key Encryption/Decryption service in `apps/api/src/services/crypto.ts`
- [ ] T033 [US3] Implement `POST /keys` and `GET /keys` endpoints in `apps/api/src/routes/keys.ts`

## Phase 6: Polish & Cross-Cutting

_Goal: Styling, Error Handling, and Deployment._

- [ ] T034 Apply UI Polish (Tailwind styles) to Editor and Dashboard components
- [ ] T035 Implement Error Boundary and Toast notifications for API/WASM failures
- [ ] T036 Configure Production Dockerfile for API
- [ ] T037 Configure Vercel Deployment for Web

## Implementation Strategy

1.  **MVP (Phases 1-3)**: Focus on getting the Resume Builder working first. This proves the core technical risk (Pyodide/WASM/RenderCV) and delivers the highest value story.
2.  **AI & General Docs (Phase 4)**: Once the editor/preview loop is stable, add the AI generation capabilities.
3.  **Management (Phase 5)**: Build out the surrounding management features last.

## Parallel Execution Examples

**Phase 3 (Resume Builder)**:

- Developer A: T014, T015 (Frontend Editor UI)
- Developer B: T016, T017 (Pyodide/RenderCV Logic)
- Developer C: T011, T012, T013 (Backend API & Schema)

**Phase 4 (General Docs)**:

- Developer A: T022, T023 (Frontend UI)
- Developer B: T020, T021, T026 (Backend AI Services)
- Developer C: T024, T025 (Plotting/Typst Logic)

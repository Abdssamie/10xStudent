# 10xStudent Implementation Roadmap (REVISED)

> **Based on:** Comprehensive analysis of specs/00-06  
> **Last Updated:** 2026-02-06  
> **Estimated Total Time:** 4-6 weeks

## Overview

This roadmap implements the 10xStudent MVP as specified in the original specs, using:

- **Client-side AI** (TanStack AI + Gemini)
- **Server-side Typst compilation** (Docker)
- **Async embeddings** (BullMQ)
- **Single `/api/chat` endpoint** pattern

**Current Completion:** ~35%

---

## Phase Breakdown

### Phase 1: Infrastructure & Database Foundation (CRITICAL)

**Duration:** 3-4 days  
**File:** `01-REVISED-infrastructure-database.md`

**Goals:**

- Fix Docker Compose (pgvector, Typst, Redis)
- Run database migrations (already exist)
- Set up BullMQ worker for async embeddings
- Configure Clerk webhooks
- Create Typst templates package

**Blockers:** None  
**Dependencies:** None

---

### Phase 2: Backend API - Single Chat Endpoint Pattern (CRITICAL)

**Duration:** 5-7 days  
**File:** `02-REVISED-backend-chat-endpoint.md`

**Goals:**

- Implement `/api/compile` endpoint (Typst Docker)
- Implement `/api/chat` with SSE streaming
- Implement server tools WITHIN `/api/chat`:
  - `webSearch` (Tavily API)
  - `addSource` (creates source with embedding=null)
  - `querySourcesRAG` (pgvector semantic search)
  - `saveDocument` (auto-save)
  - `checkCredits` (pessimistic locking)
  - `getNextCitationNumber` (atomic increment)
  - `addCitation` (tracks in citations table)
  - `updateBibliography` (regenerates from citations)
- Implement BullMQ embedding worker (runs every 30s)
- Implement Clerk webhook handler

**Blockers:** Requires Phase 1  
**Dependencies:** Phase 1

---

### Phase 3: Frontend - 3-Pane Layout & State Management (HIGH)

**Duration:** 2-3 days  
**File:** `03-REVISED-frontend-layout-state.md`

**Goals:**

- Install dependencies (CodeMirror, TanStack Query, Zustand, Clerk, TanStack AI)
- Create 3-pane layout component
- Set up Zustand stores (UI state ONLY)
- Create EditorContext (for EditorView reference)
- Set up TanStack Query provider
- Configure Clerk provider

**Blockers:** None (can run parallel with Phase 2)  
**Dependencies:** None

---

### Phase 4: Editor & Preview with Auto-Save (HIGH)

**Duration:** 4-5 days  
**File:** `04-REVI-preview.md`

**Goals:**

- Build TypstEditor component (CodeMirror 6)
- Implement 1000-line limit (transaction filter)
- Build PDFPreview component
- Implement auto-compile (2s debounce → `/api/compile`)
- Implement auto-save (5s debounce → `saveDocument` tool)
- Create StatusBar component
- Create ErrorPanel component

**Blockers:** Requires Phase 2 (compile endpoint) and Phase 3 (layout)  
**Dependencies:** Phase 2, Phase 3

---

### Phase 5: AI Chat with Client-Side Execution (HIGH)

**Duration:** 4-5 days  
**File:** `05-REVISED-ai-chat-integration.md`

**Goals:**

- Create AIChat component
- Implement `useTypstChat` hook (TanStack AI client)
- Connect to `/api/chat` SSE endpoint
- Implement client tools:
  - `replaceContent` (CodeMirror transaction)
  - `insertContent` (CodeMirror transaction)
  - `addCitation` (CodeMirror transaction)
- Implement research depth selector (quick/deep)
- Handle streaming responses
- Display tool execution progress
- Credit balance display and blocking

**Blockers:** Requires Phase 2 (chat endpoint) and Phase 4 (editor)  
**Dependencies:** Phase 2, Phase 4

---

### Phase 6: Source Management & Citations (HIGH)

**Duration:** 3-4 days  
\*\*File: `06-REVISED-sources-citations.md`

**Goals:**

- Create SourceSidebar component
- Implement manual source addition (URL + metadata)
- Display source list with metadata
- Implement citation formatting (APA/MLA/Chicago)
- Auto-generate bibliography from citations table
- Edit/delete source functionality

**Blockers:** Requires Phase 5 (AI adds sources)  
**Dependencies:** Phase 5

---

### Phase 7: Templates & Document Creation (MEDIUM)

**Duration:** 2-3 days  
**File:** `07-REVISED-templates-creation.md`

**Goals:**

- Create 5 Typst templates in `packages/templates/`:
  - Research Paper
  - Report
  - Essay
  - Article
  - Notes
- Create TemplateSelector component
- Implement document creation flow
- Document list page

**Blockers:** None (can run parallel)  
**Dependencies:** Phase 3 (layout)

---

### Phase 8: Polish & Production Readiness (MEDIUM)

**Duration:** 3-4 days  
**File:** `08-REVISED-polish-production.md`

**Goals:**

- PDF caching (5-minute TTL, content hash)
- Error handling and recovery
- Loading states and skeletons
- Performance optimization
- Security audit
- Deployment documentation

**Blockers:** Requires all previous phases  
**Dependencies:** Phase 1-7

---

## Critical Path

```
Phase 1 (Infrastructure)
  → Phase 2 (Backend /api/chat)
    → Phase 3 (Frontend Layout) [parallel with Phase 2]
      → Phase 4 (Editor/Preview)
        → Phase 5 (AI Chat)
          → Phase 6 (Sources/Citations)
            → Phase 8 (Polish)

Phase 7 (Templates) can run parallel with Phase 3-6
```

**Total Critical Path Time:** 21-28 days

---

## Execution Strategy

### Recommended: MVP-First Sequential

1. **Week 1:** Phase 1 + Phase 2 (Backend foundation)
2. **Week 2:** Phase 3 + Phase 4 (Editor/Preview working)
3. **DEMO CHECKPOINT** - Can edit and preview documents
4. **Week 3:** Phase 5 + Phase 7 (AI chat + templates)
5. **Week 4:** Ph + Phase 8 (Sources + polish)

---

## Key Architectural Principles

1. **Client-side AI execution** - TanStack AI runs in browser
2. **Single `/api/chat` endpoint** - All server tools execute here
3. **Async embeddings** - BullMQ background jobs (non-blocking)
4. **EditorView in Context** - Not Zustand (mutable object)
5. **Pessimistic credit locking** - Reserve before, deduct after
6. **Server-side Typst** - Docker container, not WASM
7. **Templates as code** - Version controlled, not database
8. **Atomic citation counter** - Database field, not client-side

---

## Success Criteria

### Phase 1-2 Complete (Backend MVP):

- ✅ Docker services running (postgres, typst, redis)
- ✅ `/api/compile` compiles Typst to PDF
- ✅ `/api/chat` streams AI responses with tool execution
- ✅ BullMQ worker generates embeddings asynchronously

### Phase 3-4 Complete (Editor MVP):

- ✅ 3-pane layout renders correctly
- ✅ Can edit Typst in CodeMirror
- ✅ PDF preview updates (2s debounce)
- ✅ Auto-save works (5s debounce)

### Phase 5-6 Complete (AI Integration):

- ✅ Can chat with AI about document
- ✅ AI searches web and adds sources
- ✅ AI edits content via tools
- ✅ Citations tracked and formatted correctly

### Phase 7-8 Complete (Production Ready):

- ✅ All 5 templates available
- ✅ Document creation flow works
- ✅ Performance meets targets (< 3s compile)
- ✅ Error handling is robust

---

## Next Steps

1. **Review this revised roadmap** - Confirm alignment with specs
2. **Read Phase 1 plan** - `01-REVISED-infrastructure-database.md`
3. **Begin implementation** - Use `@superpowers/executing-plans` skill
4. **Frequent commits** - Atomic, tested changes

---

## Notes

- All plans follow TDD approach where applicable
- Plans assume Bun as package manager
- Plans include verification steps before moving to next phase
- Plans are written for engineers with zero context about codebase

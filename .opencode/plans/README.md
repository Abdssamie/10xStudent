# 10xStudent Implementation Plans

> **Status:** Plans revised based on comprehensive spec analysis  
> **Last Updated:** 2026-02-06  
> **Alignment:** Matches specs/00-06 user stories and architecture

---

## Overview

These implementation plans guide the development of 10xStudent MVP following the **Eno methodology** with superpowers workflow.

**Key Architectural Principles:**
- ✅ Client-side AI execution (TanStack AI in browser)
- ✅ Single `/api/chat` endpoint (all server tools execute here)
- ✅ Server-side Typst compilation (Docker, not WASM)
- ✅ Async embeddings (BullMQ background jobs)
- ✅ EditorView in React Context (NOT Zustand)
- ✅ Pessimistic credit locking
- ✅ Templates as code (not database)
- ✅ Atomic citation counter

---

## Plan Files

### Core Plans (Detailed)
1. **00-REVISED-implementation-roadmap.md** - Master roadmap with 8 phases
2. **01-REVISED-infrastructure-database.md** - Docker, pgvector, BullMQ, templates
3. **02-REVISED-backend-chat-endpoint.md** - /api/compile, /api/chat, server tools

### Summary Plans
4. **03-08-REVISED-frontend-polish-summary.md** - Phases 3-8 overview

### Legacy Plans (Deprecated)
- `00-overview-implementation-roadmap.md` - OLD (ignore)
- `01-docker-infrastructure.md` - OLD (ignore)
- `02-backend-api-endpoints.md` - OLD (ignore)
- `03-frontend-dependencies.md` - OLD (ignore)
- `04-05-06-phases-summary.md` - OLD (ignore)

---

## Phase Overview

| Phase | Duration | Status | Description |
|-------|----------|--------|-------------|
| **Phase 1** | 3-4 days | Not Started | Infrastructure & Database |
| **Phase 2** | 5-7 days | Not Started | Backend API (chat endpoint) |
| **Phase 3** | 2-3 days | Not Started | Frontend Layout & State |
| **Phase 4** | 4-5 days | Not Started | Editor & Preview |
| **Phase 5** | 4-5 days | Not Started | AI Chat Integration |
| **Phase 6** | 3-4 days | Not Started | Sources & Citations |
| **Phase 7** | 2-3 days | Not Started | Templates & Creation |
| **Phase 8** | 3-4 days | Not Started | Polish & Production |

**Total Estimated Time:** 26-35 days (4-5 weeks)

---

## How to Use These Plans

### 1. Start with Phase 1

Read: `01-REVISED-infrastructure-database.md`

Execute using: `@superpowers/executing-plans` skill

### 2. Follow Task-by-Task

Each plan has numbered tasks with:
- Exact file paths
- Complete code snippets
- Test commands
- Commit messages
- Verification steps

### 3. Request Detailed Plans

For Phases 3-8, request:
```
"Generate detailed implementation plan for Phase [N]"
```

### 4. Verify Before Moving On

Each phase has a verification checklist. Complete it before proceeding.

---

## Execution Strategies

### Option A: Sequential (Recommendor Solo)
Execute phases 1→2→3→4→5→6→7→8 in order.

**Pros:** Clear dependencies, easier debugging  
**Cons:** Longer total time

### Option B: MVP-First (Recommended for Quick Demo)
1. Phase 1 (Infrastructure)
2. Phase 2 (Backend)
3. Phase 3 (Frontend setup)
4. Phase 4 (Editor/Preview)
5. **DEMO CHECKPOINT** - Working editor
6. Continue with Phases 5-8

**Pros:** Working demo in 2 weeks  
**Cons:** No AI initially

### Option C: Parallel (Recommended for Team)
- **Stream 1:** Phase 1 → Phase 2
- **Stream 2:** Phase 3 → Phase 4 (starts after Phase 1)
- **Stream 3:** Phase 7 (templates, parallel with Phase n- **Merge:** Phase 5 → Phase 6 → Phase 8

**Pros:** Faster (3-4 weeks)  
**Cons:** Requires coordination

---

## Critical Success Criteria

### Backend Complete (Phases 1-2):
- ✅ Docker services running (postgres, typst, redis)
- ✅ `/api/compile` compiles Typst to PDF
- ✅ `/api/chat` streams with server tools
- ✅ BullMQ generates embeddings async
- ✅ Clerk webhook creates users

### Frontend Complete (Phases 3-4):
- ✅ 3-pane layout renders
- ✅ CodeMirror editor works
- ✅ PDF preview updates (2s debounce)
- ✅ Auto-save works (5s debounce)
EditorView in Context (not Zustand)

### AI Integration Complete (Phases 5-6):
- ✅ AI chat streams responses
- ✅ AI searches web and adds sources
- ✅ AI edits document via client tools
- ✅ Citations formatted correctly
- ✅ Credits tracked and deducted

### Production Ready (Phases 7-8):
- ✅ All 5 templates available
- ✅ Document creation flow works
- ✅ Performance meets targets
- ✅ Error handling robust
- ✅ Ready for deployment

---

## Key Differences from Original Plans

### What Changed:
1. **AI Architecture:** Client-side execution (was server-side)
2. **API Pattern:** Single `/api/chat` endpoint (was multiple routes)
3. *mbeddings:** Async BullMQ (was blocking API calls)
4. **State Management:** EditorView in Context (was Zustand)
5. **Layout:** 3-pane with toggle (was 2-pane)
6. **Citations:** Separate table with atomic counter (was client-side)

### Why It Changed:
- Aligned with original specs (specs/00-06)
- Followed user stories and requirements
- Matched architectural decisions and rationale
- Implemented correct technical patterns

---

## Next Steps

1. **Review roadmap:** Read `00-REVISED-implementation-roadmap.md`
2. **Start Phase 1:** Read `01-REVISED-infrastructure-database.md`
3. **Execute with superpowers:** Use `@superpowers/executing-plans`
4. **Commit frequently:** Atomic, tested changes
5. **Verify each phase:** Complete checklist before moving on

---

## Questions?

If unclear about any phase:
1. Read the detailed plan file
2. Check the original specs (specs/00-06)
3. Request clarification or detailed plan generation
4. Use `@superpowers` skills for execution guidance

---

**Good luck with implementation! 🚀**

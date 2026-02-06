# Phases 4-6: Implementation Summary

> **Note:** Due to file size constraints, these phases are summarized here. Full detailed plans can be generated on-demand.

## Phase 4: Editor & Preview Components (4-5 days)

**Goal:** Build CodeMirror Typst editor and PDF preview with auto-save/auto-compile.

**Key Tasks:**
1. Create debounce utility hook
2. Build CodeMirror 6 editor component with Typst theme
3. Build PDF preview component
4. Create document editor page with split-pane layout
5. Implement auto-save (5s debounce)
6. Implement auto-compile (2s debounce)
7. Create document list page
8. Update home page with navigation

**Dependencies:** Phase 2 (API endpoints), Phase 3 (Frontend deps)

**Deliverables:**
- Working editor with syntax highlighting
- Live PDF preview
- Auto-save to backend
- Auto-compile on changes

---

## Phase 5: AI Chat Integration (3-4 days)

**Goal:** Implement AI chat UI with TanStack AI and tool execution.

**Key Tasks:**
1. Create chat UI component (sidebar)
2. Implement SSE streaming client
3. Connect server tools (webSearch, addSource)
4. Connect client tools (replaceContent, insertContent)
5. Implement tool execution handlers
6. Add chat history persistence
7. Add credit deduction on AI operations
8. Error handling and loading states

**Dependencies:** Phase 2 (API endpoints), Phase 4 (Editor)

**Deliverables:**
- Working AI chat interface
- Streaming responses
- Tool execution (web search, content editing)
- Credit tracking

---

## Phase 6: Polish & Production Readiness (3-5 days)

**Goal:** Add production features, optimization, and error handling.

**Key Tasks:**
1. Add rate limiting middleware (10 compilations/minute)
2. Configure Pino logging with request tracing
3. Implement PDF caching (5-minute TTL with content hash)
4. Add comprehensive input validation (Zod schemas)
5. Add error boundaries and fallback UI
6. Implement loading skeletons
7. Performance optimization (code splitting, lazy loading)
8. Add analytics and monitoring hooks
9. Security audit (CSP, CORS, auth)
10. Documentation and deployment guide

**Dependencies:** All previous phases

**Deliverables:**
- Production-ready application
- Comprehensive error handling
- Performance optimizations
- Security hardening
- Deployment documentation

---

## How to Generate Detailed Plans

When ready to implement a specific phase, ask:

```
"Generate detailed implementation plan for Phase [4|5|6]"
```

This will create a step-by-step plan with:
- Exact file paths
- Complete code snippets
- Test commands
- Commit messages
- Verification steps

---

## Execution Options

### Option A: Sequential (Recommended)
Execute Phase 4 → Phase 5 → Phase 6 in order.

### Option B: MVP-First
Execute Phase 4 only for working editor/preview, skip AI chat initially.

### Option C: Parallel (Team)
- Developer 1: Phase 4 (Editor/Preview)
- Developer 2: Phase 5 (AI Chat)
- Developer 3: Phase 6 (Polish) after Phase 4 completes

---

## Success Criteria

### Phase 4 Complete:
- ✅ Can edit Typst documents
- ✅ Can see live PDF preview
- ✅ Auto-save works (5s)
- ✅ Auto-compile works (2s)

### Phase 5 Complete:
- ✅ Can chat with AI
- ✅ AI can search web and add sources
- ✅ AI can edit document content
- ✅ Credits are tracked

### Phase 6 Complete:
- ✅ Rate limiting prevents abuse
- ✅ Logging provides observability
- ✅ Performance meets targets
- ✅ Ready for production deployment

# Phases 3-8: Frontend & Polish (Summary)

> **Note:** These phases are summarized here. Detailed step-by-step plans can be generated on-demand when ready to implement.

---

## Phase 3: Frontend - 3-Pane Layout & State Management (2-3 days)

**Goal:** Set up frontend architecture with correct state management pattern.

**Key Tasks:**
1. Install dependencies (CodeMirror 6, TanStack Query v5, TanStack AI, Zustand, Clerk)
2. Configure providers (Clerk, QueryClient, EditorContext)
3. Create 3-pane layout (Sidebar 300px | Center toggle | Right 50%)
4. Set up Zustand stores (UI state ONLY, NOT EditorView)
5. Create EditorContext (for mutable EditorView reference)

**Dependencies:** None (can run parallel with Phase 2)

---

## Phase 4: Editor & Preview with Auto-Save (4-5 days)

**Goal:** Build CodeMirror editor and PDF preview with auto-save/auto-compile.

**Key Tasks:**
1. Create TypstEditor component (CodeMirror 6, 1000-line limit)
2. Create PDFPreview component (embed tag, blob URL management)
3. Implement auto-compile (2s debounce to /api/compile)
4. Implement auto-save (5s debounce via saveDocument tool)
5. Create StatusBar and ErrorPanel components

**Dependencies:** Phase 2 (compile endpoint), Phase 3 (layout)

---

## Phase 5: AI Chat with Client-Side Execution (4-5 days)

**Goal:** Implement AI chat UI with TanStack AI client and tool execution.

**Key Tasks:**
1. Create AIChat component (streaming messages, research depth selector)
2. Implement useTypstChat hook (TanStack AI client-side)
3. Implement client tools (replaceContent, insertContent, addCitation)
4. Display tool execution progress
5. Credit management (display balance, block when zero)

**Dependencies:** Phase 2 (chat endpoint), Phase 4 (editor)

---

## Phase 6: Source Management & Citations (3-4 days)

**Goal:** Implement source sidebar and citation formatting.

**Key Tasks:**
1. Create SourceSidebar component (list sources, metadata, CRUD)
2. Implement manual source addition (URL + metadata extraction)
3. Implement citation formatting (APA/MLA/Chicago)
4. Auto-generate bibliography (from citations table)
5. Citation tracking (sequential numbering, position tracking)

**Dependencies:** Phase 5 (AI adds sources)

---

## Phase 7: Templates & Document Cr days)

**Goal:** Implement document creation flow with template selection.

**Key Tasks:**
1. Create TemplateSelector component (modal with 5 templates)
2. Implement document creation flow
3. Create DocumentList component
4. Implement document metadata editing

**Dependencies:** Phase 3 (layout)

---

## Phase 8: Polish & Production Readiness (3-4 days)

**Goal:** Add production features, optimization, and error handling.

**Key Tasks:**
1. Implement PDF caching (5-minute TTL, content hash)
2. Add comprehensive error handling (boundaries, retry logic)
3. Implement loading states (skeletons, spinners)
4. Performance optimization (code splitting, bundle analysis)
5. Security audit (CSP, CORS, rate limiting)
6. Add monitoring (Pino logging, metrics)
7. Documentation (deployment, API, user guide)

**Dependencies:** All previous phases

---

## How to Generate Detailed Plans

When ready to implement a specific phase, request:

```
"Generate detailed implementation plan for Phase [3|4|5|6|7|8]"
```

This will create a step-by-step plan with exact file paths, complete code, test commands, and verification steps.

---

## Estimated Timeline

- Phase 3: 2-3 days
- Phase 4: 4-5 days
- Phase 5: 4-5 dn- Phase 6: 3-4 days
- Phase 7: 2-3 days
- Phase 8: 3-4 days

**Total Phases 3-8:** 18-24 days
**Combined with Phases 1-2:** 26-35 days (4-5 weeks)

---

## Next Steps

1. Complete Phase 1 and Phase 2 first
2. Request detailed plan for Phase 3 when ready
3. Execute phases sequentially or in parallel (if team)
4. Verify each phase before moving to next

# 10xStudent MVP - Specification Overview

## Project Vision

Build an AI-powered document creation platform that replaces manual research and formatting workflows. Users interact with AI agents that research topics, generate professional Typst documents, and manage citations automatically.

---

## Architecture Summary

### Core Stack

- **Frontend**: Next.js (React) + TypeScript + Zustand + TanStack Query + TanStack AI
- **Backend**: Hono API (REST endpoints)
- **Database**: Self-hosted PostgreSQL + Drizzle ORM + pgvector
- **AI**: TanStack AI with Google Gemini (client-side execution)
- **Editor**: CodeMirror 6 with Typst syntax highlighting
- **PDF**: Typst CLI (server-side compilation in Docker)
- **Auth**: Clerk (required immediately)
- **UI**: shadcn/ui components
- **Logging**: Pino
- **Storage**: S3 for images and exported PDFs

### Key Design Decisions

1. **Client-side AI execution** - TanStack AI runs in browser, not separate service
2. **Server-side PDF compilation** - Typst CLI for production-quality output with full features
3. **No version history in DB** - Client-side undo/redo only
4. **RAG with pgvector** - No external vector database
5. **Credit-based usage** - Token-based cost tracking
6. **Hard delete** - No soft delete for documents
7. **1000-line limit** - Enforced client + server side

---

## Specification Breakdown

### [Spec 1: Database & API Foundation](./01-database-api-foundation.md)

**Focus**: Data layer, authentication, CRUD operations, credit system

**Key Components**:

- PostgreSQL schema (users, documents, sources, credit_logs)
- pgvector for source embeddings (768 dimensions)
- Hono REST API endpoints
- Clerk authentication middleware
- Credit system with token tracking
- Pino structured logging
- Server tools for TanStack AI (webSearch, querySourcesRAG, saveDocument, checkCredits)

**Success Criteria**:

- API responses < 200ms
- Auto-save < 500ms
- 100% authenticated endpoints
- Atomic credit deductions

---

### [Spec 2: TanStack AI & LLM Integration](./02-tanstack-ai-llm-integration.md)

**Focus**: AI-driven document generation, tool definitions, token tracking

**Key Components**:

- TanStack AI with Google Gemini adapter
- `useTypstChat` hook for conversational refinement
- Server tools (webSearch via Tavily, querySourcesRAG, saveDocument, checkCredits)
- Client tools (replaceContent, insertContent, addCitation) using CodeMirror transactions
- Streaming progress updates
- Token tracking middleware
- Credit deduction after operations
- User-configurable research depth (quick 3-5 sources, deep 10-15 sources)

**Success Criteria**:

- AI responds < 10s
- Streaming latency < 100ms
- 95% valid Typst generation
- 100% token tracking
- CodeMirror undo/redo works after AI edits

---

### [Spec 3: Typst Document Engine & Templates](./03-typst-document-engine-templates.md)

**Focus**: Typst compilation, templates, editor, error handling

**Key Components**:

- Typst CLI (server-side Docker container)
- 5 templates (Research Paper, Report, Essay, Article, Notes)
- CodeMirror 6 with Typst syntax highlighting
- PDF preview with 2000ms debounce (server compilation)
- 1000-line limit enforcement (client + server)
- Error panel (auto-opens on compilation errors)
- AI auto-fix with user approval

**Success Criteria**:

- Compilation < 3s total (including network) for 1000 lines
- Preview updates < 3s (2s debounce + 1s compile)
- Error panel opens < 100ms
- 80% AI auto-fix success rate
- PDF caching reduces repeated compilations to <100ms

---

### [Spec 4: Source Management & RAG](./04-source-management-rag.md)

**Focus**: Source metadata, RAG semantic search, citations, bibliography

**Key Components**:

- Source extraction from URLs (cheerio web scraping)
- Google Embedding API (text-embedding-004) for RAG
- pgvector semantic search
- Manual source entry (URL or manual citation)
- Citation formatting (APA, MLA, Chicago)
- Auto-generated bibliography
- Footnote insertion by AI
- Source sidebar UI

**Success Criteria**:

- 90% successful metadata extraction
- RAG similarity > 0.7
- Correct citation formatting
- Sidebar updates < 500ms

---

### [Spec 5: UI/UX & Editor Integration](./05-ui-ux-editor-integration.md)

**Focus**: Complete user interface, layout, state management

**Key Components**:

- Clerk authentication (required immediately)
- 3-pane layout (sidebar, center toggle, preview)
- Document list with template selector
- AI chat ↔ Editor toggle
- Source sidebar (collapsible)
- Status bar (credits, compilation, auto-save, line count)
- Auto-save (5s debounce + manual button)
- Zustand for UI state
- TanStack Query for server state
- Settings panel (citation format, research depth)

**Success Criteria**:

- Auth flow < 2s
- Document list < 1s
- View toggle < 100ms
- Auto-save triggers < 5s
- Status bar updates < 100ms

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

- **Spec 1**: Database schema, API endpoints, authentication, credit system
- **Deliverable**: Working API with CRUD operations and credit tracking

### Phase 2: AI Integration (Week 2-3)

- **Spec 2**: TanStack AI setup, tool definitions, token tracking
- **Deliverable**: AI can generate text and track credits

### Phase 3: Document Engine (Week 3-4)

- **Spec 3**:pst WASM, templates, CodeMirror, PDF preview
- **Deliverable**: Users can edit Typst and see PDF preview

### Phase 4: Source Management (Week 4-5)

- **Spec 4**: RAG system, source extraction, citations, bibliography
- **Deliverable**: AI can search sources and insert citations

### Phase 5: UI Polish (Week 5-6)

- **Spec 5**: Complete UI, layout, auto-save, status indicators
- **Deliverable**: Fully functional MVP ready for production

---

## Testing Strategy

### Unit Tests

- Credit deduction logic
- Citation formatting
- Metadata extraction
- Tool definitions

### E2E Tests (Playwright)

- Authentication flow
- Document CRUD
- AI chat and generation
- Source management
- Auto-save
- Error handling

### Performance Tests

- API response times
- Compilation speed
- Auto-save latency
- RAG query performance

---

## Deployment

### Infrastructure

- **Frontend**: Vercel (Next.js)
- **Backend**: Docker on VPS (Hono API)
- **Database**: Self-hosted PostgreSQL on VPS
- **Storage**: S3 for images/PDFs

### Environment Variables

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Database
DATABASE_URL=postgresql://...

# AI
GOOGLE_API_KEY=
TAVILY_API_KEY=

# Storage
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
```

---

## Future Enhancements (Post-MVP)

### Spreadsheets (Separate Feature)

- Univer integration
- AI-powered data population
- Separate `useSpreadsheetChat` hook
- Batch operations API

### Collaboration

- Real-time editing (WebSockets)
- Comments and suggestions
- Share read-only links

### Advanced Features

- Custom templates
- PDF export/download
- Advanced Typst packages
- Mobile responsive design
- Offline mode

---

## Success Metrics

### MVP Acceptance Criteria

1. ✅ User can sign in with Clerk
2. ✅ User can create document from template
3. ✅ AI researches and generates Typst document
4. ✅ User can edit Typst directly
5. ✅ Live PDF preview (500ms debounce)
6. ✅ Sources tracked with metadata
7. ✅ AI auto-inserts citations
8. ✅ Bibliography auto-generated
9. ✅ Auto-save every 5 seconds
10. ✅ Credits tracked and deducted
11. ✅ User blocked when out of credits
12. ✅ Compilation errors shown
13. ✅ AI can auto-fix errors
14. ✅ All specs pass tests
15. ✅ Code passes lint/type-check/build

### Performance Targets

- API responses < 200ms
- Typst compilation < 3s
- Auto-save < 500ms
- AI response < 10s
- Document list < 1s

### Quality Targets

- 95% valid Typst generation
- 90% metadata extraction success
- 80% AI auto-fix success
- 100% token tracking
- Zero data loss on auto-save

---

## Next Steps

1. **Review all 5 specs** - Ensure alignment with vision
2. **Set up development environment** - Install dependencies, configure services
3. **Create project structure** - Scaffold monorepo with Turborepo
4. **Begin Phase 1** - Implement Spec 1 (Database & API Foundation)
5. \*_Iterate through phas_ - Complete each spec sequentially
6. **Test continuously** - Write tests alongside implementation
7. **Deploy to production** - Once all acceptance criteria met

---

## Questions or Clarifications?

If you need any clarification on the specs or want to adjust any design decisions, please let me know before starting implementation.

**Ready to begin? Start with Spec 1!** 🚀

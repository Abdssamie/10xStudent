# Spec 0 Scaffolding Summary - System Architecture & Integration

## 📊 Scaffolding Status: COMPLETE

**Date**: 2024-02-06  
**Spec**: Spec 0 - System Architecture & Integration  
**Approach**: Fresh start with metadata blocks (holes)  
**Granularity**: Component-level

---

## 🎯 What Was Created

### 1. Database Schema (7 files)

✅ **packages/database/src/schema/**

- `users.ts` - Users with credits system
- `documents.ts` - Documents with citation counter
- `sources.ts` - Sources with pgvector embeddings
- `citations.ts` - Citation tracking table
- `credit-logs.ts` - Credit transaction audit trail
- `index.ts` - Schema exports
- `migrations/0001_enable_pgvector.sql` - pgvector setup

### 2. API Routes (3 files)

✅ **apps/api/src/routes/**

- `credits.ts` - Credit balance and history endpoints
- `sources.ts` - Source CRUD with metadata extraction
- _(documents.ts already exists - marked for spec compliance)_

### 3. Middleware (2 files)

✅ **apps/api/src/middleware/**

- `credits.ts` - Credit checking middleware
- `logger.ts` - Pino structured logging
- _(auth.ts already exists - 80% complete)_

### 4. AI Integration (3 files)

✅ **apps/web/app/api/**

- `chat/route.ts` - Single AI endpoint with all server tools
- `compile/route.ts` - Server-side Typst compilation
- `webhooks/clerk/route.ts` - User creation webhook

### 5. Background Jobs (1 file)

✅ **apps/api/lib/**

- `queues.ts` - BullMQ workers for credits & embeddings

### 6. Services (3 files)

✅ **apps/api/lib/**

- `typst-compiler.ts` - Typst CLI execution service
- `source-extractor.ts` - Web scraping with cheerio
- `embedding.ts` - Google text-embedding-004 API

### 7. AI Tool Definitions (9 files)

✅ **packages/ai-tools/**

- `research/web-search.ts` - Tavily web search
- `research/add-source.ts` - Add source with embedding queue
- `research/query-sources-rag.ts` - pgvector semantic search
- `persistence/save-document.ts` - Save to database
- `persistence/check-credits.ts` - Credit verification
- `persistence/get-next-citation-number.ts` - Atomic counter
- `document/replace-content.ts` - CodeMirror replace (client)
- `document/insert-content.ts` - CodeMirror insert (client)
- `document/add-citation.ts` - Insert Typst footnote (client)
- `index.ts` - Tool exports

### 8. Domain Models (3 files)

✅ **packages/domain/src/**

- `document.ts` - Document Zod schemas
- `source.ts` - Source Zod schemas
- `credits.ts` - Credit cost constants
- `citations.ts` - Citation formatting (APA/MLA/Chicago)

### 9. Templates (1 file)

✅ **packages/templates/src/typst/**

- `index.ts` - 5 Typst templates (research-paper, report, essay, article, notes)

### 10. Configuration (3 files)

✅ **Root directory**

- `apps/api/Dockerfile.typst` - Typst CLI Docker container
- `.env.spec0.example` - Environment variables template
- `docker-compose.spec0.yml` - Full stack services

---

## 📋 Total Files Created: **35 metadata blocks**

Each file contains a metadata block with:

- `@id` - Unique identifier
- `@priority` - Implementation priority (high/medium/low)
- `@progress` - Current completion (0%)
- `@directive` - Clear implementation instructions
- `@context` - Link to spec section
- `@checklist` - Specific acceptance criteria
- `@deps` - Dependencies on other components
- `@skills` - Required technical skills

---

## 🔍 Verification Commands

Run these to verify the scaffolding:

```bash
# Count metadata blocks
grep -r "@id:" packages/database/src/schema packages/ai-tools packages/domain/src apps/api/lib apps/web/app/api | wc -l

# List all holes by priority
grep -r "@priority: high" packages/ apps/ | grep "@id:"

# Check dependencies
grep -r "@deps:" packages/ apps/ | grep -v "\[\]"
```

---

## 🚀 Next Steps

### Phase 1: Database Foundation (Priority: HIGH)

1. Implement `users-schema` (no deps)
2. Implement `documents-schema` (deps: users)
3. Implement `sources-schema` (deps: documents, pgvector)
4. Implement `citations-schema` (deps: documents, sources)
5. Implement `credit-logs-schema` (deps: users)
6. Run `pgvector-migration`

### Phase 2: Core Services (Priority: HIGH)

1. Implement `embedding-service`
2. Implement `source-extractor`
3. Implement `typst-compiler-service`
4. Implement `bullmq-queues`

### Phase 3: API Layer (Priority: HIGH)

1. Implement `credits-middleware`
2. Implement `logger-middleware`
3. Update `documents-crud-routes` for spec compliance
4. Implement `sources-crud-routes`
5. Implement `credits-routes`

### Phase 4: AI Integration (Priority: HIGH)

1. Implement all AI tool definitions (9 files)
2. Implement `chat-endpoint` with server tools
3. Implement `clerk-webhook`
4. Implement `compile-endpoint`

### Phase 5: Domain & Templates (Priority: MEDIUM)

1. Implement `document-schemas`
2. Implement `source-schemas`
3. Implement `credits-constants`
4. Implement `citations-formatting`
5. Implement `templates-index`

### Phase 6: Infrastructure (Priority: HIGH)

1. Configure `docker-compose.spec0.yml`
2. Create `Dockerfile.typst`
3. Set up `.env` from `.env.spec0.example`

---

## 📊 Dependency Graph

```
pgvector-migration
└── sources-schema
    └── citations-schema

users-schema
├── documents-schema
│   ├── sources-schema
│   └── citations-schema
└── credit-logs-schema

embedding-service
└── bullmq-queues
    └── chat-endpoint

All AI tool definitions
└── chat-endpoint

typst-compiler-service
└── compile-endpoint
```

---

## 🎓 Key Architectural Decisions Implemented

1. **Single AI Endpoint Pattern**: All server tools execute in `/api/chat` (not separate endpoints)
2. **Server-Side Typst Compilation**: Docker container with full feature support
3. **Async Embedding Generation**: BullMQ background jobs (non-blocking)
4. **Pessimistic Credit Locking**: Reserve before operation, refund after
5. **pgvector for RAG**: No external vector database needed
6. **Atomic Citation Numbering**: SQL increment for race-condition safety
7. **Client Tools via EditorContext**: CodeMirror access through React Context

---

## ✅ Verification Checklist

- [x] All schema files created with metadata blocks
- [x] All API routes scaffolded
- [x] All middleware scaffolded
- [x] All AI tool definitions created
- [x] All services scaffolded
- [x] Domain models scaffolded
- [x] Templates scaffolded
- [x] Configuration files created
- [x] Dependencies documented
- [x] Implementation order defined

---

## 📝 Notes

- Existing files (`auth.ts`, `documents.ts`) were preserved and marked for spec compliance updates
- All new files contain only metadata blocks (holes) - no implementation yet
- Each metadata block has specific, testable acceptance criteria
- Dependencies are explicitly tracked for correct implementation order
- All files follow the spec architecture exactly

---

## 🔧 How to Use This Scaffolding

1. **Pick a component** from the dependency graph (start with no-dep items)
2. **Read the metadata block** to understand requirements
3. **Check the @context** link to review spec details
4. **Implement following the @checklist** items
5. **Update @progress** as you complete items
6. **Mark @progress: 100** when all checklist items pass

---

**Ready for implementation!** 🚀

Start with: `users-schema` → `pgvector-migration` → `documents-schema`

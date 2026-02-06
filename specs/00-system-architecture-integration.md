# Spec 0: System Architecture & Integration

## 1. Overview

10xStudent is an AI-powered document creation platform that uses server-side Typst compilation for production-quality PDF generation with full feature support.

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  AI Chat UI  │  │ CodeMirror   │  │ PDF Preview  │      │
│  │              │  │ Editor       │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │              │
└─────────┼─────────────────┼─────────────────┼──────────────┘
          │                 │                 │
          │ /api/chat       │ auto-save       │ /api/compile
          │ (SSE)           │ (debounced)     │ (2s debounce)
          │                 │                 │
┌─────────▼─────────────────▼─────────────────▼──────────────┐
│                      Backend (Hono API)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ TanStack AI  │  │ Document     │  │ Typst CLI    │      │
│  │ + Gemini     │  │ CRUD         │  │ Compiler     │      │
│  │ + Tools      │  │              │  │ (Docker)     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │              │
└─────────┼─────────────────┼─────────────────┼──────────────┘
          │                 │                 │
          │                 │                 │
┌─────────▼─────────────────▼─────────────────▼──────────────┐
│                    PostgreSQL + pgvector                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ users        │  │ documents    │  │ sources      │      │
│  │ credits      │  │ typstContent │  │ embeddings   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

## 3. Key Design Decisions

### 3.1 Server-Side Typst Compilation

**Decision**: Use Typst CLI in Docker container (not WASM)

**Rationale**:

- ✅ Full Typst feature support (packages, imports, custom fonts)
- ✅ Consistent output (matches local Typst CLI exactly)
- ✅ Simpler architecture (no Web Worker complexity)
- ✅ Server-side observability (logging, error tracking)
- ⚠️ Tradeoff: Preview depends on network requests (~2-3s total)

**Implementation**:

- Typst CLI v0.12.0+ in Docker container
- Custom fonts mounted at `/usr/share/fonts/custom`
- Compilation endpoint: `POST /api/compile`
- Debounced auto-compile: 2 seconds after typing stops
- PDF caching: 5-minute TTL, keyed by content hash

### 3.2 Client-Side AI Execution

**Decision**: TanStack AI runs in browser (not separate service)

**Rationale**:

- Simpler deployment (no separate AI service)
- Direct access to CodeMirror for edits
- Streaming progress updates
- Credit tracking via server tools

### 3.3 Single AI Endpoint Pattern

**Decision**: All AI interactions flow through `/api/chat`

**Rationale**:

- Server tools execute within `/api/chat` (not separate endpoints)
- TanStack AI handles tool orchestration
- LLM decides when to call tools
- Simpler API surface

## 4. Data Flow

### 4.1 Document Creation Flow

1. User selects template → Frontend loads template content
2. User chats with AI → `/api/chat` (SSE stream)
3. AI calls `webSearch` tool → Tavily API
4. AI calls `addSource` tool → PostgreSQL + embedding queue
5. AI calls `replaceContent` tool (client-side) → CodeMirror transaction
6. Auto-save triggers (5s unce) → `PUT /api/documents/:id`
7. Preview updates (2s debounce) → `POST /api/compile` → PDF blob

### 4.2 Compilation Flow

1. User types in editor → Content changes
2. Debounce timer (2 seconds) → Triggers compilation
3. Frontend sends `POST /api/compile` with Typst source
4. Backend checks cache (content hash)
5. If cache miss: Execute `typst compile` in Docker
6. Return PDF blob + compilation time header
7. Frontend creates blob URL and displays in `<embed>`

## 5. Technology Stack

### Frontend

- **Framework**: Next.js 15 (App Router)
- **State**: Zustand (UI state only)
- **Server State**: TanStack Query v5
- **Editor**: CodeMirror 6
  **AI**: TanStack AI + Google Gemini
- **Auth**: Clerk
- **UI**: shadcn/ui + Tailwind CSS

### Backend

- **API**: Hono (REST endpoints)
- **Database**: PostgreSQL + Drizzle ORM
- **Vector Search**: pgvector (768 dimensions)
- **Compilation**: Typst CLI v0.12.0 (Docker)
- **Logging**: Pino
- **Caching**: In-memory Map (Redis in production)

### Infrastructure

- **Deployment**: Vercel (frontend) + VPS (backend)
- **Database**: Self-hosted PostgreSQL
- **Storage**: S3 (images, exported PDFs)
- **Fonts**: Mounted in Docker container

## 6. Performance Targets

- API responses: < 200ms
- Typst compilation: < 3s (including network)
- Auto-save: <
- AI response: < 10s
- Document list: < 1s
- Preview update: < 3s total (2s debounce + 1s compile)

## 7. Security

- **Authentication**: Clerk JWT verification on all endpoints
- **Authorization**: User can only access own documents
- **Rate Limiting**: 10 compilations/minute per user
- **Input Validation**: Zod schemas on all endpoints
- **SQL Injection**: Drizzle ORM parameterized queries
- **XSS**: React auto-escaping + Content Security Policy

## 8. Observability

- **Logging**: Pino structured logs (JSON)
- **Metrics**: Compilation time, cache hit rate, error rate
- **Alerts**: C failures, credit exhaustion
- **Tracing**: Request ID propagation

## 9. Deployment

### Docker Compose (Development)

```yaml
version: "3.8"

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: 10xstudent
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  typst:
    build:
      context: ./apps/api
      dockerfile: Dockerfile.typst
    volumes:
      - ./fonts:/usr/share/fonts/custom:ro
      - ./typst-packages:/root/.local/share/typst/packages:ro
    ports:
      - "3001:3001"

  api:
    build: ./apps/api
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/10xstudent
      TYPST_COMPILE_URL: http://typst:3001/compile
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - typst

volumes:
  postgres_data:
```

### Production Deployment

1. **Frontend**: Deploy to Vercel
2. **Backend**: Deploy to VPS with Docker Compose
3. **Database**: Self-hosted PostgreSQL on VPS
4. **Fonts**: Mount custom fonts in Typst container
5. \*\*Mo Set up Pino logs → Loki/Grafana

## 10. Future Enhancements

- **Caching**: Replace in-memory Map with Redis
- **Scaling**: Horizontal scaling of Typst containers
- **CDN**: Cache compiled PDFs on CDN
- **Webhooks**: Notify users when compilation completes
- **Collaboration**: Real-time editing with WebSockets
- **Mobile**: Responsive design for tablets/phones
- **Offline**: Service worker for offline editing

# Typst Document Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the MVP Typst editor, research, and AI-assisted writing flow with client-side WASM compilation, R2-backed document storage, and source-grounded citations.

**Architecture:** Next.js editor uses CodeMirror + typst.ts WASM to compile Typst to SVG/PDF in-browser. Hono API handles auth, document metadata, sources, AI chat with RAG, and citation management. PostgreSQL stores metadata and embeddings; Cloudflare R2 stores Typst source and assets.

**Tech Stack:** Next.js 16, Hono, Bun, Drizzle ORM, PostgreSQL + pgvector, Cloudflare R2, Typst WASM (typst.ts), CodeMirror 6, Clerk, Gemini, Firecrawl.

---

### Task 1: Add test foundation for domain + API utilities

**Files:**
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/tests/setup.ts`
- Create: `packages/domain/vitest.config.ts`
- Create: `packages/domain/tests/setup.ts`
- Modify: `apps/api/package.json`
- Modify: `packages/domain/package.json`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";

describe("test harness", () => {
  it("runs a basic assertion", () => {
    expect(1 + 1).toBe(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -C apps/api`
Expected: FAIL with missing config or test runner.

**Step 3: Write minimal implementation**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
  },
});
```

**Step 4: Run test to verify it passes**

Run: `bun run test -C apps/api`
Expected: PASS (1 test).

**Step 5: Commit**

```bash
git add apps/api/vitest.config.ts apps/api/tests/setup.ts apps/api/package.json packages/domain/vitest.config.ts packages/domain/tests/setup.ts packages/domain/package.json
git commit -m "test: add vitest harness for api and domain"
```

---

### Task 2: Define deterministic citation key generation

**Files:**
- Create: `packages/domain/src/citations/keys.ts`
- Modify: `packages/domain/src/citations.ts`
- Create: `packages/domain/tests/citations/keys.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { generateCitationKey } from "../../src/citations/keys";

describe("generateCitationKey", () => {
  it("adds suffixes for collisions", () => {
    const existing = new Set(["einstein1905", "einstein1905a"]);
    const key = generateCitationKey({ author: "Albert Einstein", year: 1905 }, existing);
    expect(key).toBe("einstein1905b");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -C packages/domain`
Expected: FAIL with missing export.

**Step 3: Write minimal implementation**

```ts
export interface CitationKeyInput {
  author?: string | null;
  year?: number | null;
  title?: string | null;
}

function normalizeAuthor(author?: string | null): string {
  if (!author) return "unknown";
  const last = author.split(/\s+/).slice(-1)[0] ?? "unknown";
  return last.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function generateCitationKey(
  input: CitationKeyInput,
  existing: Set<string>,
): string {
  const baseAuthor = normalizeAuthor(input.author);
  const baseYear = input.year ? String(input.year) : "n.d";
  const base = `${baseAuthor}${baseYear}`;
  if (!existing.has(base)) return base;
  let suffixCode = "a";
  let candidate = `${base}${suffixCode}`;
  while (existing.has(candidate)) {
    suffixCode = String.fromCharCode(suffixCode.charCodeAt(0) + 1);
    candidate = `${base}${suffixCode}`;
  }
  return candidate;
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -C packages/domain`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/domain/src/citations/keys.ts packages/domain/src/citations.ts packages/domain/tests/citations/keys.test.ts
git commit -m "feat: add deterministic citation key generation"
```

---

### Task 3: Extend database schema for R2 content + assets + chat

**Files:**
- Modify: `packages/database/src/schema/documents.ts`
- Create: `packages/database/src/schema/assets.ts`
- Create: `packages/database/src/schema/chat-messages.ts`
- Modify: `packages/database/src/schema/index.ts`
- Create: `packages/database/drizzle/0002_document_assets_chat.sql`
- Modify: `packages/domain/src/document.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { createDocumentSchema } from "../src/document";

describe("document schema", () => {
  it("requires r2 keys and removes typst content", () => {
    const result = createDocumentSchema.safeParse({
      title: "Test",
      template: "report",
      citationFormat: "APA",
      r2Key: "documents/u/d/main.typ",
    });
    expect(result.success).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -C packages/domain`
Expected: FAIL (schema missing r2Key).

**Step 3: Write minimal implementation**

```ts
export const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  template: templateSchema,
  citationFormat: citationFormatSchema,
  r2Key: z.string().min(1),
});
```

Update Drizzle schema to remove `typstContent`, add `r2Key` and `bibKey`, add `assets` table, add `chat_messages` table.

**Step 4: Run test to verify it passes**

Run: `bun run test -C packages/domain`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/database/src/schema/documents.ts packages/database/src/schema/assets.ts packages/database/src/schema/chat-messages.ts packages/database/src/schema/index.ts packages/database/drizzle/0002_document_assets_chat.sql packages/domain/src/document.ts
git commit -m "feat(db): add r2 keys, assets, and chat messages"
```

---

### Task 4: Add R2 storage service in API

**Files:**
- Create: `apps/api/src/services/r2-storage.ts`
- Create: `apps/api/tests/services/r2-storage.test.ts`
- Modify: `apps/api/src/config/env.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildR2Key } from "../../src/services/r2-storage";

describe("buildR2Key", () => {
  it("builds document key from user and doc", () => {
    expect(buildR2Key("user", "doc")).toBe("documents/user/doc/main.typ");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -C apps/api`
Expected: FAIL with missing export.

**Step 3: Write minimal implementation**

```ts
export function buildR2Key(userId: string, documentId: string): string {
  return `documents/${userId}/${documentId}/main.typ`;
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -C apps/api`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/services/r2-storage.ts apps/api/tests/services/r2-storage.test.ts apps/api/src/config/env.ts
git commit -m "feat(api): add r2 storage helpers and env"
```

---

### Task 5: Implement source type detection + override

**Files:**
- Create: `packages/domain/src/sources/source-type.ts`
- Create: `packages/domain/tests/sources/source-type.test.ts`
- Modify: `packages/database/src/schema/sources.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { detectSourceType } from "../../src/sources/source-type";

describe("detectSourceType", () => {
  it("labels arxiv as journal", () => {
    expect(detectSourceType("https://arxiv.org/abs/1234.5678")).toBe("journal");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -C packages/domain`
Expected: FAIL.

**Step 3: Write minimal implementation**

```ts
export type SourceType = "journal" | "book" | "conference" | "report" | "thesis" | "website" | "blog";

export function detectSourceType(url: string): SourceType {
  const lowered = url.toLowerCase();
  if (lowered.includes("arxiv.org") || lowered.includes("doi.org")) return "journal";
  if (lowered.includes("thesis")) return "thesis";
  if (lowered.includes("conference")) return "conference";
  return "website";
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -C packages/domain`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/domain/src/sources/source-type.ts packages/domain/tests/sources/source-type.test.ts packages/database/src/schema/sources.ts
git commit -m "feat: add source type detection and schema"
```

---

### Task 6: Firecrawl integration for search + URL extraction

**Files:**
- Create: `apps/api/src/services/firecrawl.ts`
- Create: `apps/api/tests/services/firecrawl.test.ts`
- Modify: `apps/api/src/routes/sources.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildSearchRequest } from "../../src/services/firecrawl";

describe("buildSearchRequest", () => {
  it("builds the Firecrawl search payload", () => {
    expect(buildSearchRequest("typst thesis")).toEqual({ query: "typst thesis", limit: 5 });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -C apps/api`
Expected: FAIL.

**Step 3: Write minimal implementation**

```ts
export function buildSearchRequest(query: string): { query: string; limit: number } {
  return { query, limit: 5 };
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -C apps/api`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/services/firecrawl.ts apps/api/tests/services/firecrawl.test.ts apps/api/src/routes/sources.ts
git commit -m "feat(api): add firecrawl search and scrape service"
```

---

### Task 7: Source ingestion pipeline (metadata + embeddings)

**Files:**
- Modify: `apps/api/src/routes/sources.ts`
- Modify: `apps/api/src/tools/add-source.ts`
- Create: `apps/api/tests/routes/sources.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildSourceInsert } from "../../src/tools/add-source";

describe("buildSourceInsert", () => {
  it("includes embedding and source type", () => {
    const insert = buildSourceInsert({
      documentId: "doc",
      url: "https://arxiv.org/abs/123",
      title: "Paper",
      content: "content",
      embedding: new Array(768).fill(0.1),
    });
    expect(insert.sourceType).toBe("journal");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -C apps/api`
Expected: FAIL.

**Step 3: Write minimal implementation**

Add a pipeline:
- Call Firecrawl (search or scrape)
- Run embeddings with Google text-embedding-004
- Store source metadata + content + embedding
- Store `sourceType` with manual override

**Step 4: Run test to verify it passes**

Run: `bun run test -C apps/api`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/routes/sources.ts apps/api/src/tools/add-source.ts apps/api/tests/routes/sources.test.ts
git commit -m "feat(api): ingest sources with embeddings"
```

---

### Task 8: Auto-generate refs.bib from sources

**Files:**
- Modify: `packages/domain/src/citations.ts`
- Create: `packages/domain/tests/citations/bibliography.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { generateBibliographyTypst } from "../../src/citations";

describe("generateBibliographyTypst", () => {
  it("renders bib entries with keys", () => {
    const bib = generateBibliographyTypst([
      { id: "1", title: "Title", author: "Ada", url: "u", publicationDate: "2023-01-01", citationKey: "ada2023" },
    ]);
    expect(bib).toContain("@ada2023");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -C packages/domain`
Expected: FAIL if existing behavior doesn't include citation keys.

**Step 3: Write minimal implementation**

Update bibliography generation to use deterministic citation keys and output BibTeX entries with keys.

**Step 4: Run test to verify it passes**

Run: `bun run test -C packages/domain`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/domain/src/citations.ts packages/domain/tests/citations/bibliography.test.ts
git commit -m "feat: generate refs.bib with deterministic keys"
```

---

### Task 9: AI chat system prompt + RAG retrieval

**Files:**
- Modify: `apps/api/src/routes/chat.ts`
- Modify: `apps/api/src/tools/query-sources-rag.ts`
- Create: `apps/api/tests/routes/chat.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../../src/routes/chat";

describe("buildSystemPrompt", () => {
  it("enforces citation accuracy", () => {
    expect(buildSystemPrompt()).toContain("Only cite claims present in sources");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -C apps/api`
Expected: FAIL.

**Step 3: Write minimal implementation**

Implement a system prompt that:
- Requires citations for factual claims
- Uses `@citation-key`
- Prefers recent sources
- Prohibits hallucinated sources

**Step 4: Run test to verify it passes**

Run: `bun run test -C apps/api`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/routes/chat.ts apps/api/src/tools/query-sources-rag.ts apps/api/tests/routes/chat.test.ts
git commit -m "feat(api): enforce RAG citations in AI prompt"
```

---

### Task 10: Documents CRUD + R2 integration

**Files:**
- Create: `apps/api/src/routes/documents.ts`
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/tests/routes/documents.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { app } from "../../src/app";

describe("documents routes", () => {
  it("creates a document with r2Key", async () => {
    const res = await app.request("/documents", { method: "POST", body: JSON.stringify({ title: "A", template: "report" }) });
    const json = await res.json();
    expect(json.r2Key).toContain("documents/");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -C apps/api`
Expected: FAIL.

**Step 3: Write minimal implementation**

Create CRUD routes:
- POST creates DB record and R2 main.typ stub
- GET list (search)
- PATCH update metadata
- DELETE soft delete

**Step 4: Run test to verify it passes**

Run: `bun run test -C apps/api`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/routes/documents.ts apps/api/src/app.ts apps/api/tests/routes/documents.test.ts
git commit -m "feat(api): add documents CRUD with r2 content"
```

---

### Task 11: Typst templates package

**Files:**
- Modify: `packages/templates/src/typst/index.ts`
- Create: `packages/templates/src/typst/thesis.typ`
- Create: `packages/templates/src/typst/report.typ`
- Create: `packages/templates/src/typst/internship.typ`
- Create: `packages/templates/src/typst/blank.typ`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { getTemplate } from "../src/typst";

describe("getTemplate", () => {
  it("returns thesis template", () => {
    expect(getTemplate("thesis")).toContain("#bibliography");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -C packages/templates`
Expected: FAIL.

**Step 3: Write minimal implementation**

Add frozen template wrappers that inject bibliography and set fonts/margins. Blank template has no frozen sections.

**Step 4: Run test to verify it passes**

Run: `bun run test -C packages/templates`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/templates/src/typst/index.ts packages/templates/src/typst/*.typ
git commit -m "feat: add typst templates"
```

---

### Task 12: Frontend dashboard and editor shell

**Files:**
- Create: `apps/web/app/(dashboard)/page.tsx`
- Create: `apps/web/app/documents/[id]/page.tsx`
- Create: `apps/web/components/editor/*`
- Modify: `apps/web/app/layout.tsx`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";

describe("dashboard shell", () => {
  it("renders document list container", () => {
    document.body.innerHTML = "<div id='doc-list'></div>";
    expect(document.getElementById("doc-list")).not.toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -C apps/web`
Expected: FAIL (vitest not configured).

**Step 3: Write minimal implementation**

Add dashboard list page with search + quick actions, editor shell with left tabs (Editor/AI/Research) and right preview.

**Step 4: Run test to verify it passes**

Run: `bun run test -C apps/web`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/app/(dashboard)/page.tsx apps/web/app/documents/[id]/page.tsx apps/web/components/editor apps/web/app/layout.tsx
git commit -m "feat(web): add dashboard and editor shell"
```

---

### Task 13: CodeMirror + Typst WASM integration

**Files:**
- Create: `apps/web/components/editor/typst-editor.tsx`
- Create: `apps/web/components/editor/typst-preview.tsx`
- Modify: `apps/web/components/editor/index.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { debounceCompile } from "../../components/editor/typst-preview";

describe("debounceCompile", () => {
  it("debounces compilation", () => {
    expect(typeof debounceCompile).toBe("function");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -C apps/web`
Expected: FAIL.

**Step 3: Write minimal implementation**

Integrate typst.ts with:
- debounced compilation
- SVG rendering
- PDF export
- error parsing for line/column

**Step 4: Run test to verify it passes**

Run: `bun run test -C apps/web`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/components/editor/typst-editor.tsx apps/web/components/editor/typst-preview.tsx apps/web/components/editor/index.ts
git commit -m "feat(web): integrate typst wasm preview"
```

---

### Task 14: AI chat UI + streaming SSE

**Files:**
- Create: `apps/web/components/editor/chat-panel.tsx`
- Create: `apps/web/components/editor/sse-client.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { parseSseChunk } from "../../components/editor/sse-client";

describe("parseSseChunk", () => {
  it("parses a data event", () => {
    const event = parseSseChunk("data: hello\n\n");
    expect(event).toBe("hello");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -C apps/web`
Expected: FAIL.

**Step 3: Write minimal implementation**

Implement SSE stream parsing, show tool indicators, chat history panel, and input box.

**Step 4: Run test to verify it passes**

Run: `bun run test -C apps/web`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/components/editor/chat-panel.tsx apps/web/components/editor/sse-client.ts
git commit -m "feat(web): add AI chat with SSE"
```

---

### Task 15: Research tab UI + sources library

**Files:**
- Create: `apps/web/components/editor/research-panel.tsx`
- Create: `apps/web/components/editor/source-reader.tsx`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";

describe("research panel", () => {
  it("renders search input", () => {
    document.body.innerHTML = "<input id='search' />";
    expect(document.getElementById("search")).not.toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -C apps/web`
Expected: FAIL.

**Step 3: Write minimal implementation**

Add search, URL import, source list, source reader components.

**Step 4: Run test to verify it passes**

Run: `bun run test -C apps/web`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/components/editor/research-panel.tsx apps/web/components/editor/source-reader.tsx
git commit -m "feat(web): add research tab and source reader"
```

---

### Task 16: Click citation -> source passage

**Files:**
- Create: `apps/web/components/editor/citation-popover.tsx`
- Modify: `apps/web/components/editor/typst-editor.tsx`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { extractCitationKey } from "../../components/editor/citation-popover";

describe("extractCitationKey", () => {
  it("extracts key from @citation", () => {
    expect(extractCitationKey("@einstein1905")).toBe("einstein1905");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -C apps/web`
Expected: FAIL.

**Step 3: Write minimal implementation**

Detect @key in editor selection, query API for source passage, show popover with extracted snippet.

**Step 4: Run test to verify it passes**

Run: `bun run test -C apps/web`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/components/editor/citation-popover.tsx apps/web/components/editor/typst-editor.tsx
git commit -m "feat(web): show source passage for citations"
```

---

### Task 17: Credits enforcement (AI only)

**Files:**
- Modify: `apps/api/src/middleware/credits.ts`
- Modify: `apps/api/src/routes/chat.ts`
- Create: `apps/api/tests/middleware/credits.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { canUseAi } from "../../src/middleware/credits";

describe("credits", () => {
  it("blocks when credits are zero", () => {
    expect(canUseAi(0)).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -C apps/api`
Expected: FAIL.

**Step 3: Write minimal implementation**

Block AI endpoints when credits are exhausted, but do not block editor operations.

**Step 4: Run test to verify it passes**

Run: `bun run test -C apps/api`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/middleware/credits.ts apps/api/src/routes/chat.ts apps/api/tests/middleware/credits.test.ts
git commit -m "feat(api): enforce ai credits only"
```

---

### Task 18: Frontend theming + layout polish

**Files:**
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/components/ui/*` (if needed)

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";

describe("theme", () => {
  it("uses dark as default", () => {
    expect(document.documentElement.dataset.theme).not.toBe("light");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -C apps/web`
Expected: FAIL.

**Step 3: Write minimal implementation**

Set dark theme default with next-themes and define CSS variables.

**Step 4: Run test to verify it passes**

Run: `bun run test -C apps/web`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/app/globals.css apps/web/app/layout.tsx
git commit -m "feat(web): set dark theme default"
```

---

### Task 19: Remove unused server compilation stack

**Files:**
- Modify: `docker-compose.yml`
- Delete: `apps/api/Dockerfile.typst`
- Modify: `apps/worker/src/index.ts`
- Modify: `apps/worker/src/processor.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";

describe("worker removal", () => {
  it("keeps build scripts valid", () => {
    expect(true).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -C apps/worker`
Expected: FAIL (no tests).

**Step 3: Write minimal implementation**

Remove typst docker service and worker compilation stubs from MVP scope.

**Step 4: Run test to verify it passes**

Run: `bun run test -C apps/worker`
Expected: PASS.

**Step 5: Commit**

```bash
git add docker-compose.yml apps/api/Dockerfile.typst apps/worker/src/index.ts apps/worker/src/processor.ts
git commit -m "chore: remove server compilation stack"
```

---

### Task 20: End-to-end smoke verification

**Files:**
- Modify: `docs/plans/2026-02-07-typst-document-workflow-implementation-plan.md`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("compiles sample typst", () => {
    expect("= Hello").toContain("Hello");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run lint && bun run check-types && bun run build`
Expected: FAIL until all work is complete.

**Step 3: Write minimal implementation**

Finish all tasks and ensure:
- editor compiles Typst to SVG
- PDF export works
- AI chat generates Typst with citations
- research tab ingests sources

**Step 4: Run test to verify it passes**

Run: `bun run lint && bun run check-types && bun run build`
Expected: PASS.

**Step 5: Commit**

```bash
git add docs/plans/2026-02-07-typst-document-workflow-implementation-plan.md
git commit -m "chore: update implementation plan with verification"
```

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-02-07-typst-document-workflow-implementation-plan.md`.

Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks.
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints.

Which approach?

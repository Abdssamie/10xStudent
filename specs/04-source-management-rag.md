# Spec 4: Source Management & RAG

## 1. Context

### Goal

Implement source metadata management with RAG (Retrieval-Augmented Generation) using pgvector for semantic search. Enable AI to query sources, auto-insert citations, and generate bibliographies in multiple formats (APA, MLA, Chicago).

### User Value

- All sources tracked with metadata (URL, title, author, date)
- AI can semantically search sources during document generation
- Automatic citation insertion with footnotes
- Bibliography auto-generated in chosen format
- Manual source entry supported (URLs and manual citations)

### Dependencies

- **Spec 0 (Architecture)** - Overall system design, database schema, API structure
- **Spec 1 (Database)** - pgvector schema for sources, citations table, documents.citationCount
- **Spec 2 (TanStack AI)** - AI tools: querySourcesRAG, getNextCitationNumber, addCitation, updateBibliography
- **Spec 3 (Typst)** - Citation formatting in Typst, footnote syntax, bibliography layout
- **Google Embedding API** - text-embedding-004 for generating 768-dimensional embeddings

### Relationship to Spec 0

This spec implements the **Source Management & RAG** component from Spec 0's architecture:

- **Database Layer**: Extends `sources` table with async embedding support, adds `citations` table
- **API Layer**: Provides source CRUD endpoints, background embedding job
- **AI Layer**: Provides tools for RAG queries, citation management, bibliography generation
- **UI Layer**: Source sidebar component for viewing and managing sources

Key architectural decisions from Spec 0:

- **Async-first**: Embedding generation is non-blocking (background job)
- **Server-side state**: Citation counter managed in database, not client-side
- **Tool-based AI**: All AI interactions use TanStack AI tools (Spec 2)
- **Typst integration**: Citations and bibliography use Typst syntax (Spec 3)

---

## 2. User Stories (Prioritized)

### P1: Source Discovery

- **US-01**: As a user, I want sources to appear in the sidebar after AI research completes, so that I can review what was found.
- **US-02**: As a user, I want to see source metadata (URL, title, author, date), so that I can verify credibility.
- **US-03**: As a user, I want sources to be queryable by AI using RAG, so that the AI can reference them during generation.

### P1: Manual Source Entry

- **US-04**: As a user, I want to manually add sources via URL, so that I can include references not found by AI.
- **US-05**: As a user, I want to manually enter citation details (for books, etc.), so that I can cite non-web sources.
- **US-06**: As a user, I want AI to extract metadata from URLs automatically, so that I don't have to fill in details manually.

### P1: Citation Management

- **US-07**: As a user, I want AI to auto-insert citations when referencing sources, so that I don't have to manually add footnotes.
- **US-08**: As a user, I want citations formatted as footnotes at the bottom of each page, so that they follow academic standards.
- **US-09**: As a user, I want to choose citation format (APA, MLA, Chicago), so that my document meets requirements.

### P1: Bibliography Generation

- **US-10**: As a user, I want a bibliography auto-generated at the end of my document, so that I don't have to format it manually.
- **US-11**: As a user, I want the bibliography to match my chosen citation format, so that it's consistent.

### P2: Source Editing

- **US-12**: As a user, I want to edit source metadata after AI adds it, so that I can correct errors.
- **US-13**: As a user, I want to remove sources I don't want to cite, so that my bibliography is clean.

---

## 3. Functional Requirements (Testable)

### Source Storage & Metadata

- **FR-01**: System MUST store sources in `sources` table (from Spec 1).
- **FR-02**: System MUST capture metadata:
  - `url` (required)
  - `title` (optional, extracted or manual)
  - `author` (optional, extracted or manual)
  - `publicationDate` (optional, extracted or manual)
  - `accessDate` (auto-generated timestamp)
  - `content` (extracted text for RAG)
  - `embedding` (768-dimensional vector from Google text-embedding-004)
  - `metadata` (JSON: sourceType, isAvailable, extractedAt)
- **FR-03**: System MUST link sources to documents via `documentId` foreign key.
- **FR-04**: System MUST support two source types:
  - `web` - From AI web search or manual URL entry
  - `manual` - User-entered citation (no URL)

### RAG (Retrieval-Augmented Generation)

- **FR-05**: System MUST embed source content using Google text-embedding-004 API.
- **FR-05a**: System MUST generate embeddings asynchronously using BullMQ (background job, not blocking API response).
- **FR-05b**: System MUST create sources immediately with `embedding: null`, then generate embeddings later.
- **FR-05c**: System MUST run BullMQ background job every 30 seconds to process sources without embeddings.
- **FR-06**: System MUST store embeddings in pgvector column (768 dimensions).
- **FR-07**: System MUST provide `querySourcesRAG` tool (from Spec 2) for semantic search.
- **FR-08**: System MUST return top-K most similar sources (default K=5).
- **FR-09**: System MUST include similarity score in results.
- **FR-10**: System MUST allow AI to query sources during document generation.

### Source Extraction (Web URLs)

- **FR-11**: System MUST extract metadata from URLs automatically.
- **FR-12**: System MUST use web scraping or metadata APIs (Open Graph, Twitter Cards).
- **FR-13**: System MUST extract:
  - Page title (from `<title>` or `og:title`)
  - Author (from `<meta name="author">` or `article:author`)
  - Publication date (from `<meta property="article:published_time">`)
  - Main content (from `<article>` or `<main>` tags)
- **FR-14**: System MUST handle extraction failures gracefully (store URL only).
- **FR-15**: System MUST mark sources as `isAvailable: false` if URL is inaccessible.

### Manual Source Entry

- **FR-16**: System MUST provide form for manual source entry.
- **FR-17**: System MUST support URL-based entry (AI extracts metadata).
- **FR-18**: System MUST support manual citation entry (no URL):
  - Title (required)
  - Author (optional)
  - Publication date (optional)
  - Publisher (optional)
  - ISBN/DOI (optional)
- **FR-19**: System MUST validate manual entries (title required).

### Citation Insertion

- **FR-20**: System MUST provide `addCitation` tool (from Spec 2) for AI to insert citations.
- **FR-20a**: System MUST provide `getNextCitationNumber` tool to get sequential citation numbers.
- **FR-20b**: System MUST store citation counter in `documents.citationCount` field.
- **FR-20c**: System MUST track citations in `citations` table linking sources to document positions.
- **FR-21**: System MUST format citations as Typst footnotes: `#footnote[citation_number]`.
- **FR-22**: System MUST auto-number citations sequentially using server-side counter.
- **FR-23**: System MUST insert citations inline when AI references sources.
- **FR-24**: System MUST support multiple citation formats:
  - APA (American Psychological Association)
  - MLA (Modern Language Association)
  - Chicago (Chicago Manual of Style)
- **FR-25**: System MUST format footnote content according to selected citation format.

### Bibliography Generation

- **FR-26**: System MUST auto-generate bibliography section at end of document.
- **FR-26a**: System MUST regenerate bibliography from `citations` table (only cited sources).
- **FR-26b**: System MUST provide `updateBibliography` tool for AI to regenerate bibliography.
- **FR-27**: System MUST format bibliography entries according to selected citation format.
- **FR-28**: System MUST sort bibliography entries:
  - APA/MLA: Alphabetically by author last name
  - Chicago: Alphabetically by author last name
- **FR-29**: System MUST update bibliography when sources are added/removed.
- **FR-30**: System MUST insert bibliography in Typst format using `#bibliography()` or manual list.

### Source Sidebar UI

- **FR-31**: System MUST display sources in left sidebar.
- **FR-32**: System MUST show source metadata (title, author, date, URL).
- **FR-33**: System MUST indicate source type (web vs manual).
- **FR-34**: System MUST provide actions:
  - Edit metadata
  - Remove source
  - Copy citation
- **FR-35**: System MUST update sidebar when AI adds sources.

---

## 4. Technical Architecture

### Source Extraction Service

```typescript
// apps/api/lib/actor.ts
import * as cheerio from "cheerio";

export interface ExtractedMetadata {
  title?: string;
  author?: string;
  publicationDate?: string;
  content?: string;
  isAvailable: boolean;
}

export async function extractSourceMetadata(
  url: string,
): Promise<ExtractedMetadata> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; 10xStudent/1.0)",
      },
    });

    if (!response.ok) {
      return { isAvailable: false };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract title
    const title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").text() ||
      undefined;

    // Extract author
    const author =
      $('meta[name="author"]').attr("content") ||
      $('meta[property="article:author"]').attr("content") ||
      undefined;

    // Extract publication date
    const publicationDate =
      $('meta[property="article:published_time"]').attr("content") ||
      $('meta[name="date"]').attr("content") ||
      undefined;

    // Extract main content
    const content =
      $("article").text() ||
      $("main").text() ||
      $("body").text().substring(0, 5000); // Limit to 5000 chars

    return {
      title,
      author,
      publicationDate,
      content: content?.trim(),
      isAvailable: true,
    };
  } catch (error) {
    return { isAvailable: false };
  }
}
```

### Embedding Service

```typescript
// apps/api/lib/embedding.ts
export async function embedText(text: string): Promise<number[]> {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GOOGLE_API_KEY}`,
      },
      body: JSON.stringify({
        content: {
          parts: [{ text }],
        },
      }),
    },
  );

  const data = await response.json();
  return data.embedding.values;
}
```

### Background Embedding Job with BullMQ

```typescript
// apps/api/lib/embedding-queue.ts
import { Queue, Worker } from "bullmq";
import { db, schema, eq, isNull } from "@10xstudent/database";
import { embedText } from "./embedding";
import { logger } from "@10xstudent/logger";
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
});

// Create queue for embedding generation
export const embeddingQueue = new Queue("embeddings", { connection: redis });

// Define the job processor
export function startEmbeddingWorker() {
  const worker = new Worker(
    "embeddings",
    async (job) => {
      try {
        // Find sources without embeddings (limit 10 per batch)
        const sourcesNeedingEmbedding = await db.query.sources.findMany({
          where: isNull(schema.sources.embedding),
          limit: 10,
        });

        logger.info(
          { jobId: job.id, count: sourcesNeedingEmbedding.length },
          "Processing sources for embedding",
        );

        let successCount = 0;
        let failureCount = 0;

        for (const source of sourcesNeedingEmbedding) {
          if (source.content) {
            try {
              const embedding = await embedText(source.content);
              await db
                .update(schema.sources)
                .set({ embedding })
                .where(eq(schema.sources.id, source.id));

              successCount++;
              logger.debug(
                { sourceId: source.id },
                "Generated embedding for source",
              );
            } catch (error) {
              failureCount++;
              logger.error(
                { sourceId: source.id, error },
                "Failed to embed source",
              );
            }
          } else {
            logger.debug(
              { sourceId: source.id },
              "Skipping source (no content)",
            );
          }
        }

        return {
          unt,
          failureCount,
          totalProcessed: sourcesNeedingEmbedding.length,
        };
      } catch (error) {
        logger.error({ jobId: job.id, error }, "Embedding job failed");
        throw error; // BullMQ will retry automatically
      }
    },
    { connection: redis },
  );

  worker.on("completed", (job, result) => {
    logger.info({ jobId: job.id, result }, "Embedding job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, error: err, attempts: job?.attemptsMade },
      "Embedding job failed",
    );
  });

  return worker;
}

// Schedule recurring job (runs every 30 seconds)
export async function scheduleEmbeddingJob() {
  await embeddingQueue.add(
    "process-embeddings",
    {},
    {
      repeat: {
        every: 30000, // Run every 30 seconds
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );

  logger.info("Embedding job scheduled (runs every 30s)");
}
```

### Server Startup Integration

```typescript
// apps/api/index.ts
import { Hono } from "hono";
import { startEmbeddingWorker, scheduleEmbeddingJob } from "./lib/embedding-qurt { startCreditResetWorker, scheduleMonthlyCreditsReset } from "./lib/queues";
import sourcesRouter from "./routes/sources";

const app = new Hono();

// Mount routes
app.route("/api/sources", sourcesRouter);

// Start background job workers
startEmbeddingWorker();
scheduleEmbeddingJob();

startCreditResetWorker();
scheduleMonthlyCreditsReset();

logger.info("[Server] BullMQ workers started");

export default app;
```

### Source API Endpoints

```typescript
// apps/api/routes/sources.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, schema, eq } from "@10xstudent/database";
import { createSourceSchema, updateSourceSchema } from "@10xstudent/domain";
import { authMiddleware } from "../middleware/auth";
import { extractSourceMetadata } from "../lib/source-extractor";
import { embedText } from "../lib/embedding";

const app = new Hono();

app.use("*", authMiddleware);

// Create source (with automatic metadata extraction)
// NOTE: Embedding generation is ASYNC (background job) - does NOT block response
app.post("/", zValidator("json", createSourceSchema), async (c) => {
  const userId = c.get("auth").userId;
  const data = c.req.valid("json");

  // Extract metadata if URL provided
  let metadata: any = { sourceType: "manual" };
  let content = data.content;

  if (data.url) {
    const extracted = await extractSourceMetadata(data.url);
    metadata = {
      sourceType: "web",
      isAvailable: extracted.isAvailable,
      extractedAt: new Date().toISOString(),
    };

    // Use extracted data if not provided
    if (!data.title && extracted.title) data.title = extracted.title;
    if (!data.author && extracted.author) data.author = extracted.author;
    if (!data.publicationDate && extracted.publicationDate) {
      data.publicationDate = extracted.publicationDate;
    }

    content = extracted.content || data.content;
  }

  // Create source immediately with embedding: null
  // Background job will generate embedding asynchronously
  const [source] = await db
    .insert(schema.sources)
    .values({
      ...data,
      content,
      embedding: null, // Will be generated by background job
      metadata,
    })
    .returning();

  return c.json(source, 201);
});

// List sources for document
app.get("/:documentId", async (c) => {
  const userId = c.get("auth").userId;
  const documentId = c.req.param("documentId");

  // Verify document ownership
  const document = await db.query.documents.findFirst({
    where: eq(schema.documents.id, documentId),
  });

  if (!document || document.userId !== userId) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const sources = await db.query.sources.findMany({
    where: eq(schema.sources.documentId, documentId),
    orderBy: [schema.sources.createdAt],
  });

  return c.json(sources);
});

// Update source metadata
app.put("/:id", zValidator("json", updateSourceSchema), async (c) => {
  const userId = c.get("auth").userId;
  const id = c.req.param("id");
  const data = c.req.valid("json");

  // Verify ownership via document
  const source = await db.query.sources.findFirst({
    where: eq(schema.sources.id, id),
    with: { document: true },
  });

  if (!source || source.document.userId !== userId) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const [updated] = await db
    .update(schema.sources)
    .set(data)
    .where(eq(schema.sources.id, id))
    .returning();

  return c.json(updated);
});

// Delete source
app.delete("/:id", async (c) => {
  const userId = c.get("auth").userId;
  const id = c.req.param("id");

  const source = await db.query.sources.findFirst({
    where: eq(schema.sources.id, id),
    with: { document: true },
  });

  if (!source || source.document.userId !== userId) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  await db.delete(schema.sources).where(eq(schema.sources.id, id));

  return c.json({ success: true });
});

export default app;
```

### Citation Management System

#### Database Schema Extensions

```typescript
// packages/database/src/schema.ts

// Add citation counter to documents table
export const documents = pgTable("documents", {
  // ... existing fields ...
  citationCount: integer("citation_count").notNull().default(0),
});

// New citations table to track which sources are cited and where
export const citations = pgTable("citations", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id")
    .notNull()
    .references(() => sources.id, { onDelete: "cascade" }),
  citationNumber: integer("citation_number").notNull(),
  position: integer("position").notNull(), // Character position in document
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const citationsRelations = relations(citations, ({ one }) => ({
  document: one(documents, {
    fields: [citations.documentId],
    references: [documents.id],
  }),
  source: one(sources, {
    fields: [citations.sourceId],
    references: [sources.id],
  }),
}));
```

#### Citation Tools for AI

```typescript
// apps/api/lib/actor.ts (TanStack AI tools)
import { db, schema, eq, sql } from "@10xstudent/database";
import { z } from "zod";

// Tool: Get next citation number
const getNextCitationNumberDef = {
  description: "Get the next sequential citation number for a document",
  parameters: z.object({
    documentId: z.string().uuid(),
  }),
};

const getNextCitationNumber = getNextCitationNumberDef.server(
  async ({ documentId }) => {
    const [doc] = await db
      .update(schema.documents)
      .set({ citationCount: sql`citation_count + 1` })
      .where(eq(schema.documents.id, documentId))
      .returning();

    return {
      citationNumber: doc.citationCount,
      message: `Next citation number is ${doc.citationCount}`,
    };
  },
);

// Tool: Add citation (links source to document position)
const addCitationDef = {
  description: "Add a citation linking a source to a position in the document",
  parameters: z.object({
    documentId: z.string().uuid(),
    sourceId: z.string().uuid(),
    citationNumber: z.number().int().positive(),
    position: z.number().int().nonnegative(),
  }),
};

const addCitation = addCitationDef.server(
  async ({ documentId, sourceId, citationNumber, position }) => {
    const [citation] = await db
      .insert(schema.citations)
      .values({
        documentId,
        sourceId,
        citationNumber,
        position,
      })
      .returning();

    return {
      success: true,
      citation,
      message: `Citation ${citationNumber} added at position ${position}`,
    };
  },
);

// Tool: Update bibliography (regenerates from citations table)
const updateBibliographyDef = {
  description: "Regenerate bibliography from all citations in the document",
  parameters: z.object({
    documentId: z.string().uuid(),
    format: z.enum(["APA", "MLA", "Chicago"]),
  }),
};

const updateBibliography = updateBibliographyDef.server(
  async ({ documentId, format }) => {
    // Get all citations with their sources
    const citations = await db.query.citations.findMany({
      where: eq(schema.citations.documentId, documentId),
      with: {
        source: true,
      },
      orderBy: [schema.citations.citationNumber],
    });

    // Generate bibliography in Typst format
    const bibliography = generateBibliographyTypst(
      citations.map((c) => c.source),
      format,
    );

    return {
      success: true,
      bibliography,
      citationCount: citations.length,
    };
  },
);

// Export tools for TanStack AI
export const citationTools = {
  getNextCitationNumber,
  addCitation,
  updateBibliography,
};
```

#### Citation Flow Example

```typescript
/**
 * CITATION FLOW:
 *
 * 1. AI finds relevant information in a source via querySourcesRAG
 * 2. AI calls getNextCitationNumber({ documentId }) → returns { citationNumber: 1 }
 * 3. AI inserts text with footnote: "Climate change is accelerating#footnote[1]"
 * 4. AI calls addCitation({ documentId, sourceId, citationNumber: 1, position: 42 })
 * 5. Citation record created linking source to position
 * 6. When document is complete, AI calls updateBibliography({ documentId, format: "APA" })
 * 7. Bibliography generated from all citations and appended to document
 */
```

### Citation Formatting

```typescript
// packages/domain/src/citations.ts
export type CitationFormat = "APA" | "MLA" | "Chicago";

export interface Source {
  id: string;
  url?: string;
  title?: string;
  author?: string;
  publicationDate?: string;
  accessDate: string;
}

export function formatCitation(
  source: Source,
  format: CitationFormat,
  citationNumber: number,
): string {
  switch (format) {
    case "APA":
      return formatAPA(source, citationNumber);
    case "MLA":
      return formatMLA(source, citationNumber);
    case "Chicago":
      return formatChicago(source, citationNumber);
  }
}

function formatAPA(source: Source, num: number): string {
  const author = source.author || "Unknown Author";
  const year = source.publicationDate
    ? new Date(source.publicationDate).getFullYear()
    : "n.d.";
  const title = source.title || "Untitled";
  const url = source.url || "";
  const accessDate = new Date(source.accessDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `${num}. ${author}. (${year}). ${title}. Retrieved ${accessDate}, from ${url}`;
}

function formatMLA(source: Source, num: number): string {
  const author = source.author || "Unknown Author";
  const title = source.title || "Untitled";
  const url = source.url || "";
  const accessDate = new Date(source.accessDate).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${num}. ${author}. "${title}." Web. ${accessDate}. <${url}>.`;
}

function formatChicago(source: Source, num: number): string {
  const author = source.author || "Unknown Author";
  const title = source.title || "Untitled";
  const url = source.url || "";
  const accessDate = new Date(source.accessDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return `${num}. ${author}, "${title}," accessed ${accessDate}, ${url}.`;
}

export function generateBibliography(
  sources: Source[],
  format: CitationFormat,
): string {
  const sorted = [...sources].sort((a, b) => {
    const authorA = a.author || "Unknown";
    const authorB = b.author || "Unknown";
    return authorA.localeCompare(authorB);
  });

  const entries = sorted.map((source, index) =>
    formatCitation(source, format, index + 1),
  );

  return `= References\n\n${entries.join("\n\n")}`;
}

/**
 * Generate bibliography in Typst format
 * This is inserted at the end of the document by the AI
 */
export function generateBibliographyTypst(
  sources: Source[],
  format: CitationFormat,
): string {
  const sorted = [...sources].sort((a, b) => {
    const authorA = a.author || "Unknown";
    const authorB = b.author || "Unknown";
    return authorA.localeCompare(authorB);
  });

  const entries = sorted.map((source, index) =>
    formatCitation(source, format, index + 1),
  );

  // Typst format with proper heading and spacing
  return `
#pagebreak()

= References

${entries.map((entry) => `- ${entry}`).join("\n\n")}
`.trim();
}
```

### Complete Source & Citation Workflow

#### Phase 1: Source Discovery & Addition

```typescript
/**
 * COMPLETE FLOW: Web Search → Add Source → Embedding → RAG Query → Citation
 *
 * 1. USER: "Write an essay about climate change"
 *
 * 2. AI: Calls webSearch({ query: "climate change causes effects" })
 *    Returns: [
 *      { url: "https://nasa.gov/climate", title: "Climate Change Evidence", snippet: "..." },
 *      { url: "https://ipcc.ch/report", title: "IPCC Report 2023", snippet: "..." }
 *    ]
 *
 * 3. AI: Converts search results to sources by calling addSource for each:
 *    addSource({
 *      documentId: "doc-123",
 *      url: "https://nasa.gov/climate",
 *      // title, author, etc. extracted automatically
 *    })
 *    → Source created immediately with embedding: null
 *    → Returns source ID: "source-456"
 *
 * 4. BACKGROUND JOB (30s later):
 *    - Finds sources with embedding: null
 *    - Generates embedding from source.content
 *    - Updates source with embedding vector
 *
 * 5. AI: Queries sources using RAG (after embeddings are ready):
 *    querySourcesRAG({
 *      documentId: "doc-123",
 *      query: "What are the main causes of climate change?"
 *    })
 *    → Returns top 5 most relevant sources with similarity scores
 *
 * 6. AI: Uses source information to write content with citations:
 *    - Calls getNextCitationNumber({ documentId: "doc-123" }) → { citationNumber: 1 }
 *    - Writes: "Human activities are the primary cause of climate change#footnote[1]"
 *    - Calls addCitation({
 *        documentId: "doc-123",
 *        sourceId: "source-456",
 *        citationNumber: 1,
 *        position: 58
 *      })
 *
 * 7. AI: At end of document, regenerates bibliography:
 *    updateBibliography({ documentId: "doc-123", format: "APA" })
 *    → Returns formatted bibliography from citations table
 *    → AI appends to document
 */
```

#### Phase 2: Citation Workflow Detail

````typescript
/**
 * CITATION WORKFLOW EXAMPLE:
 *
 * Document: "Climate Change Essay"
 * Sources: 3 sources added (NASA, IPCC, EPA)
 *
 * Step 1: AI writes first paragraph
 * --------------------------------
 * AI: getNextCitationNumber({ documentId }) → { citationNumber: 1 }
 * AI: Writes "Global temperatures have risen 1.1°C since 1880#footnote[1]"
 * AI: addCitation({ documentId, sourceId: "nasa-source", citationNumber: 1, position: 52 })
 *
 * Step 2: AI writes second paragraph
 * ----------------------------------
 * AI: getNextCitationNumber({ documentId }) → { citationNumber: 2 }
 * AI: Writes "The IPCC warns of severe consequences#footnote[2]"
 * AI: addCitation({ documentId, sourceId: "ipcc-source", citationNumber: 2, position: 120 })
 *
 * Step 3: AI cites same source again
 * -----------------------------------
 * AI: getNextCitationNumber({ documentId }) → { citationNumber: 3 }
 * AI: Writes "Further evidence shows#footnote[3]"
 * AI: addCitation({ documentId, sourceId: "nasa-source", citationNumber: 3, position: 180 })
 *
 * Step 4: Generate bibliography
 * ------------------------------
 * AI: updateBibliography({ documentId, format: "APA" })
 * Returns:
 * ```
 * #pagebreak()
 *
 * = References
 *
 * - 1. NASA. (2023). Climate Change Evidence. Retrieved January 15, 2024, from https://nasa.gov/climate
 *
 * - 2. IPCC. (2023). IPCC Report 2023. Retrieved January 15, 2024, from https://ipcc.ch/report
 *
 * - 3. NASA. (2023). Climate Change Evidence. Retrieved January 15, 2024, from https://nasa.gov/climate
 * ```
 *
 * Note: Same source (NASA) appears twice with different citation numbers
 * This is correct - each citation gets a unique number
 */
````

#### When AI Should Add Sources

```typescript
/**
 * AI DECISION TREE: When to add sources
 *
 * 1. After webSearch:
 *    - Convert ALL relevant search results to sources
 *    - Don't wait for user confirmation
 *    - Sources appear in sidebar immediately
 *
 * 2. User manually adds URL:
 *    - User clicks "Add Source" in sidebar
 *    - Enters URL
 *    - API extracts metadata and creates source
 *
 * 3. User manually enters citation:
 *    - User clicks "Add Manual Citation"
 *    - Enters title, author, etc.
 *    - API creates source with sourceType: "manual"
 *
 * 4. During document generation:
 *    - AI should NOT add new sources mid-generation
 *    - Only use existing sources from sidebar
 *    - Query existing sources with querySourcesRAG
 */
```

### Source Sidebar Component

```typescript
// apps/web/components/sources/SourceSidebar.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Source {
  id: string
  url?: string
  title?: string
  author?: string
  publicationDate?: string
  accessDate: string
  metadata: {
    sourceType: 'web' | 'manual'
    isAvailable?: boolean
  }
}

export function SourceSidebar({ documentId }: { documentId: string }) {
  const [isAddingSource, setIsAddingSource] = useState(false)
  const [newSourceUrl, setNewSourceUrl] = useState('')
  const queryClient = useQueryClient()

  const { data: sources = [] } = useQuery({
    queryKey: ['sources', documentId],
    queryFn: async () => {
      const res = await fetch(`/api/sources/${documentId}`)
      return res.json()
    },
  })

  const addSourceMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, url }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources', documentId] })
      setNewSourceUrl('')
      setIsAddingSource(false)
    },
  })

  const deleteSourceMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      await fetch(`/api/sources/${sourceId}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources', documentId] })
    },
  })

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Sources</h3>
        <Button size="sm" onClick={() => setIsAddingSource(true)}>
          + Add
        </Button>
      </div>

      {isAddingSource && (
        <div className="space-y-2 p-3 border rounded-lg">
          <Label>URL</Label>
          <Input
            value={newSourceUrl}
            onChange={(e) => setNewSourceUrl(e.target.value)}
            placeholder="https://example.com/article"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => addSourceMutation.mutate(newSourceUrl)}
              disabled={!newSourceUrl}
            >
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsAddingSource(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {sources.map((source: Source) => (
          <div key={source.id} className="p-3 border rounded-lg space-y-1">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {source.title || 'Untitled'}
                </div>
                {source.author && (
                  <div className="text-xs text-gray-600">{source.author}</div>
                )}
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline truncate block"
                  >
                    {source.url}
                  </a>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {source.metadata.sourceType === 'web' ? '🌐 Web' : '📝 Manual'}
                  {source.metadata.isAvailable === false && ' (Unavailable)'}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteSourceMutation.mutate(source.id)}
              >
                ✕
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 5. Success Criteria (Measurable)

- **SC-01**: Source metadata extraction succeeds for 90% of web URLs.
- **SC-02**: RAG semantic search returns relevant sources with >0.7 similarity score.
- **SC-03**: Citations are formatted correctly in all 3 formats (APA, MLA, Chicago).
- **SC-04**: Bibliography is auto-generated and sorted correctly.
- **SC-05**: Source sidebar updates within 500ms of AI adding sources.
- **SC-06**: Manual source entry completes within 2 seconds (non-blocking).
- **SC-07**: Background embedding job processes sources within 60 seconds of creation.
- **SC-08**: Citation numbering is sequential and consistent across document.
- **SC-09**: Bibliography includes only cited sources (from citations table).

---

## 6. Edge Cases & Error Handling

### Source Extraction

- **EC-01**: If URL is inaccessible, store URL only and mark `isAvailable: false`.
- **EC-02**: If metadata extraction fails, use URL as title.
- **EC-03**: If content extraction fails, skip embedding generation (embedding stays null).

### Async Embedding Generation (BullMQ)

- **EC-04**: If source is created without content, embedding stays null permanently.
- **EC-05**: If embedding API fails, BullMQ automatically retries the job (max 3 attempts).
- **EC-06**: If embedding API rate limit hit, job fails and retries on next cycle (30s later).
- **EC-07**: If source is deleted before embedding generated, job skips gracefully.
- **EC-08**: If AI queries sources before embeddings ready, return only sources with embeddings.
- **EC-09**: If Redis connection fails, BullMQ queues jobs and processes them when Redis is available.

### RAG

- **EC-09**: If no sources have embeddings yet, return empty results with message.
- **EC-10**: If embedding API fails during query, log error and return empty results.
- **EC-11**: If similarity scores are all below threshold (0.5), return empty results.

### Citations

- **EC-12**: If source has no title, use "Untitled".
- **EC-13**: If source has no author, use "Unknown Author".
- **EC-14**: If source has no date, use "n.d." (no date).
- **EC-15**: If citation number is requested but document doesn't exist, return error.
- **EC-16**: If addCitation called with invalid sourceId, return error.
- **EC-17**: If bibliography generated with no citations, return empty bibliography section.

---

## 7. Implementation Checklist

### Setup

- [ ] Install dependencies: `cheerio`, `@google/generative-ai`
- [ ] Configure Google Embedding API key

### Database Migrations

- [ ] Add `citationCount` field to `documents` table
- [ ] Create `citations` table with relations
- [ ] Add indexes for citation queries

### Source Extraction

- [ ] Implement metadata extraction service
- [ ] Implement embedding generation service
- [ ] Test extraction on various websites

### Background Jobs (BullMQ + Redis)

- [ ] Install BullMQ and Redis dependencies
- [ ] Configure Redis connection
- [ ] Implement embedding job processor
- [ ] Schedule recurring job (every 30s)
- [ ] Start embedding worker on server startup
- [ ] Add logging for embedding job progress
- [ ] Configure job retry logic and error handling

### API

- [ ] Implement source CRUD endpoints
- [ ] Update POST endpoint to create sources without embeddings (async)
- [ ] Remove synchronous embedding generation from API

### RAG

- [ ] Implement `querySourcesRAG` tool (already in Spec 2)
- [ ] Test semantic search with pgvector

### Citations

- [ ] Implement `getNextCitationNumber` tool
- [ ] Implement `addCitation` tool (links source to position)
- [ ] Implement `updateBibliography` tool
- [ ] Implement citation formatting (APA, MLA, Chicago)
- [ ] Implement bibliography generation in Typst format
- [ ] Test citation numbering and tracking

### UI

- [ ] Implement source sidebar component
- [ ] Implement manual source entry form
- [ ] Implement source editing

### Testing

- [ ] Unit tests for citation formatting
- [ ] Unit tests for metadata extraction
- [ ] E2E tests for source management
- [ ] E2E tests for RAG queries

---

## 8. Out of Scope

- Advanced citation formats (IEEE, Harvard, etc.)
- Citation management tools (Zotero integration)
- Duplicate source detection
- Source versioning (tracking changes to sources)
- Embedding caching or optimization
- Advanced job scheduling (priority queues, delayed jobs)
- Citation editing after insertion
- Automatic citation style detection

---

## 9. Implementation Notes

### Performance Considerations

- **Embedding Generation**: BullMQ processes sources every 30 seconds with automatic retries and error handling.
- **RAG Query Performance**: pgvector cosine similarity is fast (<100ms) for up to 10,000 sources per document.
- **Citation Counter**: Using SQL `citation_count + 1` ensures atomic increments without race conditions.
- **Redis**: Use Redis Cluster for high availability in production.

### Testing Strategy

1. **Unit Tests**:
   - Citation formatting (APA, MLA, Chicago)
   - Metadata extraction from various HTML structures
   - Embedding generation and storage

2. **Integration Tests**:
   - Source creation → embedding job → RAG query flow
   - Citation numbering sequence (concurrent requests)
   - Bibliography generation from citations table

3. **E2E Tests**:
   - User adds source → appears in sidebar → AI queries it → AI cites it → bibliography generated
   - Background job processes sources within 60 seconds

### Migration Path

```sql
-- Migration: Add citation support
ALTER TABLE documents ADD COLUMN citation_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  citation_number INTEGER NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_citations_document_id ON citations(document_id);
CREATE INDEX idx_citations_source_id ON citations(source_id);
CREATE INDEX idx_citations_number ON citations(document_id, citation_number);
```

---

## 10. Next Steps

After completing this spec:

1. Proceed to **Spec 5: UI/UX & Editor Integration**
2. Sources will be displayed in sidebar with real-time updates
3. Citations will be inserted by AI during generation
4. Background embedding job will run on server startup
5. Bibliography will be auto-generated at document completion

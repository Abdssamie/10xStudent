# Spec 2: TanStack AI & LLM Integration

## 1. Context

### Goal

Integrate TanStack AI with Google Gemini to power the AI-driven document creation workflow. This includes client-side AI execution, tool definitions (server and client), conversational refinement, streaming progress, and token tracking for credit deduction.

### User Value

- Natural language document creation
- Real-time AI streaming progress
- Configurable research depth (quick vs deep)
- AI edits documents using CodeMirror transactions (preserves undo/redo)
- Transparent credit usage based on actual token consumption

### Dependencies

- TanStack AI (`@tanstack/ai`, `@tanstack/ai-react`, `@tanstack/ai-gemini`)
- Google Gemini API (gemini-2.0-flash-thinking-exp)
- Tavily API (web search)
- Google Embedding API (text-embedding-004 for RAG)
- Spec 0 (Database & API Foundation) - credit system, database schema
- CodeMirror 6 - editor integration via EditorContext

### Architecture Notes

**CRITICAL CHANGES FROM TYPICAL PATTERNS:**

1. **Single `/api/chat` endpoint**: All server tools execute in this endpoint. No separate API routes per tool.
2. **Tool definitions vs implementations**: `packages/ai-tools/` contains only schemas. Implementations go in `/api/chat` (server) or client components (client).
3. **EditorContext pattern**: Client tools access CodeMirror via React Context, not global state or direct imports.
4. **Pessimistic credit locking**: Credits are reserved before operations and adjusted after completion.

---

## 2. User Stories (Prioritized)

### P1: AI Chat & Document Generation

- **US-01**: As a user, I want to chat with AI to refine my document requirements, so that the AI understands what I need.
- **US-02**: As a user, I want the AI to decide when it has enough information, so that I don't have to manually trigger generation.
- **US-03**: As a user, I want to see streaming progress ("Searching...", "Found 5 sources...", "Generating..."), so that I know the AI is working.
- **US-04**: As a user, I want the AI to generate Typst content directly in my editor, so that I can see results immediately.

### P1: Research & Sources

- **US-05**: As a user, I want to configure research depth (quick 3-5 sources vs deep 10-15 sources), so that I can balance speed and thoroughness.
- **US-06**: As a user, I want the AI to search the web for relevant sources, so that my document is backed by credible information.
- **US-07**: As a user, I want sources to appear in the sidebar after research completes, so that I can review what the AI found.

### P1: AI Editing

- **US-08**: As a user, I want the AI to edit my document like a code editor (replace, insert), so that changes are precise.
- **US-09**: As a user, I want to undo AI changes, so that I can revert if the AI makes mistakes.

### P1: Credit Management

- **US-10**: As a user, I want to see my credit balance before AI operations, so that I know if I have enough credits.
- **US-11**: As a user, I want credits deducted based on actual token usage, so that costs are fair.
- **US-12**: As a user, I want to be blocked from AI operations when out of credits, so that I don't incur unexpected costs.

---

## 3. Functional Requirements (Testable)

### TanStack AI Setup

- **FR-01**: System MUST use `@tanstack/ai-react` for client-side AI execution.
- **FR-02**: System MUST use `@tanstack/ai-gemini` adapter with `gemini-2.0-flash-thinking-exp` model.
- **FR-03**: System MUST support multi-provider configuration (OpenAI, Anthropic, Gemini, Ollama) via environment variables.
- **FR-04**: System MUST use `useChat` hook from `@tanstack/ai-react` for chat interface.
- **FR-05**: System MUST stream AI responses in real-time.

### Tool Definitions

- **FR-06**: System MUST define tools using `toolDefinition()` from `@tanstack/ai`.
- **FR-07**: System MUST implement server tools with `.server()` in `/api/chat` endpoint:
  - `webSearch` - Tavily API search
  - `addSource` - Convert webSearch results into database sources with embeddings
  - `querySourcesRAG` - Semantic search using pgvector
  - `saveDocument` - Persist document to database
  - `checkCredits` - Verify user has sufficient credits
  - `getNextCitationNumber` - Get and increment citation counter for document
- **FR-08**: System MUST implement client tools with `.client()` in React components:
  - `replaceContent` - Replace text range in CodeMirror
  - `insertContent` - Insert text at position in CodeMirror
  - `addCitation` - Insert citation in Typst format
- **FR-09**: System MUST organize tools by domain:
  - `packages/ai-tools/document/` - Client tool definitions (schemas only)
  - `packages/ai-tools/research/` - Server tool definitions (schemas only)
  - `packages/ai-tools/persistence/` - Server tool definitions (schemas only)
  - Tool implementations go in `/api/chat` (server) or client components (client)
- **FR-10**: System MUST auto-execute all tools (no approval flow for MVP).
- **FR-11**: System MUST provide EditorContext for client tools to access CodeMirror instance.

### Conversational Refinement

- **FR-12**: System MUST allow unlimited back-and-forth exchanges before generation.
- **FR-13**: System MUST let AI decide when it has enough information to generate.
- **FR-14**: System MUST provide system prompt that guides AI behavior:
  - Ask clarifying questions if requirements are vague
  - Suggest research depth based on topic complexity
  - Generate Typst syntax (not Markdown or LaTeX)
  - Always cite sources using footnotes

### Research Depth Configuration

- **FR-15**: System MUST allow users to configure research depth:
  - `quick`: 3-5 sources, faster generation
  - `deep`: 10-15 sources, more comprehensive
- **FR-16**: System MUST pass research depth to `webSearch` tool as parameter.
- **FR-17**: System MUST display research depth setting in UI.

### Streaming Progress

- **FR-18**: System MUST stream progress updates during AI operations:
  - "Searching for sources..."
  - "Found X sources"
  - "Analyzing sources..."
  - "Generating document..."
  - "Inserting citations..."
- **FR-19**: System MUST display streaming progress in chat interface.

### AI Editing with CodeMirror Transactions

- **FR-20**: System MUST use CodeMirror transactions for all AI edits.
- **FR-21**: System MUST preserve undo/redo history when AI edits.
- **FR-22**: System MUST support operations:
  - Replace range: `{ from: number, to: number, insert: string }`
  - Insert at position: `{ from: number, insert: string }`
- **FR-23**: System MUST validate edit positions (within document bounds).

### Token Tracking & Credit Deduction

- **FR-24**: System MUST use pessimistic credit locking before AI operations:
  - Reserve estimated credits before operation starts
  - Release reserved credits if operation fails
  - Deduct actual usage after operation completes
- **FR-25**: System MUST track token usage from Gemini API responses.
- **FR-26**: System MUST extract token count from response metadata:
  - `promptTokens` - Input tokens
  - `completionTokens` - Output tokens
  - `totalTokens` - Total tokens
- **FR-27**: System MUST deduct credits after each AI operation using `deductCredits()` from Spec 0.
- **FR-28**: System MUST check credits before AI operations using `checkCredits` tool.
- **FR-29**: System MUST block AI operations if user has insufficient credits.
- **FR-30**: System MUST display credit cost estimate before expensive operations.

### Error Handling

- **FR-31**: System MUST handle AI errors gracefully:
  - Network errors: Show retry button
  - Rate limits: Show wait time
  - Invalid responses: Show error message
- **FR-32**: System MUST handle tool execution errors:
  - Web search fails: Inform user, suggest retry
  - Save fails: Queue for retry with exponential backoff
  - Credit check fails: Block operation, show error

---

## 4. Technical Architecture

### Tool Organization

**IMPORTANT**: Tool definitions (schemas) are separate from implementations.

```
packages/ai-tools/
├── document/              # Client tool definitions (schemas only)
│   ├── replace-content.ts
│   ├── insert-content.ts
│   ├── add-citation.ts
│   └── index.ts
├── research/              # Server tool definitions (schemas only)
│   ├── web-search.ts
│   ├── add-source.ts
│   ├── query-sources-rag.ts
│   └── index.ts
├── persistence/           # Server tool definitions (schemas only)
│   ├── save-document.ts
│   ├── check-credits.ts
│   ├── get-next-citation-number.ts
│   └── index.ts
└── index.ts               # Export all tool definitions

apps/web/
├── app/api/chat/
│   └── route.ts           # Server tool implementations execute HERE
└── components/
    └── editor/
        ├── EditorContext.tsx  # Provides CodeMirror instance to client tools
        └── TypstEditor.tsx    # Client tool implementations execute HERE
```

### Tool Definitions (Schemas Only)

**These files contain ONLY the tool schemas, not implementations.**

```typescript
// packages/ai-tools/research/web-search.ts
import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

export const webSearchDef = toolDefinition({
  name: "webSearch",
  description: "Search the web for relevant sources on a topic",
  inputSchema: z.object({
    query: z.string().describe("Search query"),
    maxResults: z
      .number()
      .default(5)
      .describe("Maximum number of results (3-15)"),
  }),
  outputSchema: z.array(
    z.object({
      url: z.string(),
      title: z.string(),
      snippet: z.string(),
      content: z.string(),
    }),
  ),
});

// packages/ai-tools/research/add-source.ts
export const addSourceDef = toolDefinition({
  name: "addSource",
  description: "Add a source to the document and queue embedding generation",
  inputSchema: z.object({
    documentId: z.string().uuid(),
    url: z.string().url(),
    title: z.string(),
    content: z.string(),
  }),
  outputSchema: z.object({
    sourceId: z.string().uuid(),
    citationNumber: z.number(),
  }),
});

// packages/ai-tools/research/query-sources-rag.ts
export const querySourcesRAGDef = toolDefinition({
  name: "querySourcesRAG",
  description: "Semantically search sources already added to the document",
  inputSchema: z.object({
    documentId: z.string().uuid(),
    query: z.string(),
    topK: z.number().default(5),
  }),
  outputSchema: z.array(
    z.object({
      sourceId: z.string(),
      title: z.string(),
      content: z.string(),
      similarity: z.number(),
    }),
  ),
});

// packages/ai-tools/persistence/save-document.ts
export const saveDocumentDef = toolDefinition({
  name: "saveDocument",
  description: "Save document content to database",
  inputSchema: z.object({
    documentId: z.string().uuid(),
    typstContent: z.string(),
  }),
  outputSchema: z.object({ success: z.boolean() }),
});

// packages/ai-tools/persistence/check-credits.ts
export const checkCreditsDef = toolDefinition({
  name: "checkCredits",
  description: "Check if user has sufficient credits for an operation",
  inputSchema: z.object({
    userId: z.string().uuid(),
    estimatedTokens: z.number(),
  }),
  outputSchema: z.object({
    hasCredits: z.boolean(),
    currentBalance: z.number(),
    estimatedCost: z.number(),
  }),
});

// packages/ai-tools/persistence/get-next-citation-number.ts
export const getNextCitationNumberDef = toolDefinition({
  name: "getNextCitationNumber",
  description:
    "Get the next citation number for a document (atomically increments counter)",
  inputSchema: z.object({
    documentId: z.string().uuid(),
  }),
  outputSchema: z.object({
    citationNumber: z.number(),
  }),
});

// packages/ai-tools/document/replace-content.ts
export const replaceContentDef = toolDefinition({
  name: "replaceContent",
  description: "Replace a range of text in the Typst document",
  inputSchema: z.object({
    from: z.number().describe("Start position (character index)"),
    to: z.number().describe("End position (character index)"),
    content: z.string().describe("New content to insert"),
  }),
  outputSchema: z.object({ success: z.boolean() }),
});

// packages/ai-tools/document/insert-content.ts
export const insertContentDef = toolDefinition({
  name: "insertContent",
  description: "Insert text at a specific position in the Typst document",
  inputSchema: z.object({
    position: z.number().describe("Position to insert (character index)"),
    content: z.string().describe("Content to insert"),
  }),
  outputSchema: z.object({ success: z.boolean() }),
});

// packages/ai-tools/document/add-citation.ts
export const addCitationDef = toolDefinition({
  name: "addCitation",
  description: "Insert a citation footnote in Typst format",
  inputSchema: z.object({
    position: z.number(),
    sourceId: z.string().uuid(),
    citationNumber: z.number(),
  }),
  outputSchema: z.object({ success: z.boolean() }),
});
```

### Server-Side: `/api/chat` Endpoint

**CRITICAL**: All server tools execute in this single endpoint. No separate API routes per tool.

```typescript
// apps/web/app/api/chat/route.ts
import { chat, toServerSentEventsResponse } from "@tanstack/ai";
import { geminiText } from "@tanstack/ai-gemini";
import { auth } from "@clerk/nextjs/server";
import { db, schema, eq, sql } from "@10xstudent/database";
import {
  webSearchDef,
  addSourceDef,
  querySourcesRAGDef,
  saveDocumentDef,
  checkCreditsDef,
  getNextCitationNumberDef,
} from "@10xstudent/ai-tools";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, documentId } = await request.json();

  // 1. Reserve credits pessimistically (see Spec 0 for credit system)
  const estimatedTokens = messages.reduce(
    (sum: number, m: any) => sum + (m.content?.length || 0) * 0.25,
    0,
  );
  const estimatedCost = Math.ceil(estimatedTokens / 1000);

  const reservation = await db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .for("update"); // Pessimistic lock

    if (user.credits < estimatedCost) {
      throw new Error("Insufficient credits");
    }

    // Reserve credits
    await tx
      .update(schema.users)
      .set({ credits: user.credits - estimatedCost })
      .where(eq(schema.users.id, userId));

    return { reservedAmount: estimatedCost, previousBalance: user.credits };
  });

  try {
    // 2. Define server tools with implementations
    const webSearch = webSearchDef.server(async ({ query, maxResults }) => {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
        },
        body: JSON.stringify({
          query,
          max_results: maxResults,
          include_raw_content: true,
        }),
      });

      const data = await response.json();
      return data.results.map((result: any) => ({
        url: result.url,
        title: result.title,
        snippet: result.snippet,
        content: result.raw_content || result.snippet,
      }));
    });

    const addSource = addSourceDef.server(
      async ({ documentId, url, title, content }) => {
        // Insert source into database
        const [source] = await db
          .insert(schema.sources)
          .values({
            documentId,
            url,
            title,
            content,
            createdAt: new Date(),
          })
          .returning();

        // Queue embedding generation (async job - see Spec 4)
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/embeddings/generate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sourceId: source.id }),
          },
        );

        // Get citation number atomically
        const [doc] = await db
          .update(uments)
          .set({
            citationCounter: sql`${schema.documents.citationCounter} + 1`,
          })
          .where(eq(schema.documents.id, documentId))
          .returning({ citationCounter: schema.documents.citationCounter });

        return {
          sourceId: source.id,
          citationNumber: doc.citationCounter,
        };
      },
    );

    const querySourcesRAG = querySourcesRAGDef.server(
      async ({ documentId, query, topK }) => {
        // 1. Embed query using Google Embedding API
        const embeddingResponse = await fetch(
          "https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.GOOGLE_API_KEY}`,
            },
            body: JSON.stringify({
              content: { parts: [{ text: query }] },
            }),
          },
        );

        const embeddingData = await embeddingResponse.json();
        const queryEmbedding = embeddingData.embedding.values;

        // 2. Semantic search using pgvector
        const results = await db.execute(sql`
        SELECT id, title, content, 
               1 - (embedding <=> ${queryEmbedding}::vector) as similarity
        FROM sources
        WHERE document_id = ${documentId}
        ORDER BY embedding <=> ${queryEmbedding}::vector
        LIMIT ${topK}
      `);

        return results.rows.map((row: any) => ({
          sourceId: row.id,
          title: row.title,
          content: row.content,
          similarity: row.similarity,
        }));
      },
    );

    const saveDocument = saveDocumentDef.server(
      async ({ documentId, typstContent }) => {
        await db
          .update(schema.documents)
          .set({ typstContent, updatedAt: new Date() })
          .where(eq(schema.documents.id, documentId));

        return { success: true };
      },
    );

    const checkCredits = checkCreditsDef.server(
      async ({ userId, estimatedTokens }) => {
        const user = await db.query.users.findFirst({
          where: eq(schema.users.id, userId),
        });

        const estimatedCost = Math.ceil(estimatedTokens / 1000);

        return {
          hasCredits: (user?.credits || 0) >= estimatedCost,
          currentBalance: user?.credits || 0,
          estimatedCost,
        };
      },
    );

    const getNextCitationNumber = getNextCitationNumberDef.server(
      async ({ documentId }) => {
        const [doc] = await db
          .update(schema.documents)
          .set({
            citationCounter: sql`${schema.documents.citationCounter} + 1`,
          })
          .where(eq(schema.documents.id, documentId))
          .returning({ citationCounter: schema.documents.citationCounter });

        return { citationNumber: doc.citationCounter };
      },
    );

    // 3. Create chat stream with all tools
    const stream = chat({
      adapter: geminiText("gemini-2.0-flash-thinking-exp", {
        apiKey: process.env.GOOGLE_API_KEY,
      }),
      messages,
      tools: [
        webSearch,
        addSource,
        querySourcesRAG,
        saveDocument,
        checkCredits,
        getNextCitationNumber,
      ],
      systemPrompt: `You are an expert Typst document assistant. You help users create professional documents by researching topics, generating Typst syntax, and managing citations.

Key behaviors:
1. Ask clarifying questions if requirements are vague
2. Suggest research depth based on topic complexity (quick for simple topics, deep for complex research)
3. Always generate valid Typst syntax (not Markdown or LaTeX)
4. Use footnotes for citations: #footnote[citation number]
5. When editing, use replaceContent or insertContent tools with precise character positions
6. Always cite sources when referencing information
7. Stream progress updates so users know what you're doing

When you have enough information, proceed with:
1. Search the web using webSearch tool
2. For each relevant result, use addSource to save it to the database
3. Analyze sources and extract relevant information
4. Generate Typst content using replaceContent or insertContent
5. Add citations using addCitation tool
6. Save document using saveDocument tool`,
    });

    // 4. Track actual token usage and adjust credits
    stream.on("finish", async (result) => {
      const actualTokens = result.usage?.totalTokens || 0;
      const actualCost = Math.ceil(actualTokens / 1000);
      const refund = reservation.reservedAmount - actualCost;

      if (refund > 0) {
        // Refund unused credits
        await db
          .update(schema.users)
          .set({ credits: sql`${schema.users.credits} + ${refund}` })
          .where(eq(schema.users.id, userId));
      }

      // Log usage (see Spec 0 for credit transaction schema)
      await db.insert(schema.creditTransactions).values({
        userId,
        operation: "TYPST_GENERATION",
        amount: -actualCost,
        metadata: { tokens: actualTokens, documentId },
        createdAt: new Date(),
      });
    });

    return toServerSentEventsResponse(stream);
  } catch (error) {
    // Release reserved credits on error
    await db
      .update(schema.users)
      .set({
        credits: sql`${schema.users.credits} + ${reservation.reservedAmount}`,
      })
      .where(eq(schema.users.id, userId));

    throw error;
  }
}
```

### Client-Side: EditorContext & Client Tools

```typescript
// apps/web/components/editor/EditorContext.tsx
import { createContext, useContext, type ReactNode } from "react";
import type { EditorView } from "@codemirror/view";

interface EditorContextValue {
  editorView: EditorView | null;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({
  children,
  editorView,
}: {
  children: ReactNode;
  editorView: EditorView | null;
}) {
  return (
    <EditorContext.Provider value={{ editorView }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditor must be used within EditorProvider");
  }
  if (!context.editorView) {
    throw new Error("EditorView not initialized");
  }
  return context.editorView;
}
```

```typescript
// apps/web/components/editor/TypstEditor.tsx
import { useRef, useEffect } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorProvider } from "./EditorContext";
import { TypstChat } from "../chat/TypstChat";

export function TypstEditor({ documentId }: { documentId: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const view = new EditorView({
      extensions: [basicSetup],
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, []);

  return (
    <EditorProvider editorView={viewRef.current}>
      <div className="flex h-screen">
        <div ref={editorRef} className="flex-1" />
        <TypstChat documentId={documentId} />
      </div>
    </EditorProvider>
  );
}
```

### Client-Side: Chat Component with Client Tools

```typescript
// apps/web/components/chat/TypstChat.tsx
import { useChat, createChatClientOptions, fetchServerSentEvents, clientTools } from "@tanstack/ai-react";
import { useEditor } from "../editor/EditorContext";
import {
  replaceContentDef,
  insertContentDef,
  addCitationDef,
} from "@10xstudent/ai-tools";

export function TypstChat({ documentId }: { documentId: string }) {
  const editor = useEditor();

  // Define client tools with implementations
  const replaceContent = replaceContentDef.client(({ from, to, content }) => {
    editor.dispatch({
      changes: { from, to, insert: content },
    });
    return { success: true };
  });

  const insertContent = insertContentDef.client(({ position, content }) => {
    editor.dispatch({
      changes: { from: position, insert: content },
    });
    return { success: true };
  });

  const addCitation = addCitationDef.client(({ position, sourceId, citationNumber }) => {
    editor.dispatch({
      changes: { from: position, insert: `#footnote[${citationNumber}]` },
    });
    return { success: true };
  });

  // Create chat options with client tools
  const textOptions = createChatClientOptions({
    connection: fetchServerSentEvents("/api/chat"),
    tools: clientTools(replaceContent, insertContent, addCitation),
    body: { documentId }, // Pass documentId to server
  });

  const { messages, sendMessage, isLoading } = useChat(textOptions);

  return (
    <div className="w-96 border-l flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message, i) => (
          <div key={i} className={message.role === "user" ? "text-right" : "text-left"}>
            <div className="inline-block p-2 rounded bg-gray-100">
              {message.content}
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem("message") as HTMLInputElement;
          sendMessage(input.value);
          input.value = "";
        }}
        className="p-4 border-t"
      >
        <input
          name="message"
          placeholder="Describe your document..."
          className="w-full p-2 border rounded"
          disabled={isLoading}
        />
      </form>
    </div>
  );
}
```

### Complete AI Workflow Example

**User Flow**: User asks AI to create a research paper on quantum computing.

1. **User sends message**: "Create a 5-page research paper on quantum computing applications"

2. **AI analyzes request**: Determines it needs sources, asks clarifying questions if needed

3. **AI calls `webSearch` tool** (server-side):

   ```typescript
   webSearch({ query: "quantum computing applications", maxResults: 10 });
   // Returns: [{ url, title, snippet, content }, ...]
   ```

4. **AI calls `addSource` tool** for each result (server-side):

   ```typescript
   addSource({
     documentId: "...",
     url: "https://example.com/quantum",
     title: "Quantum Computing Applications",
     content: "...",
   });
   // Returns: { sourceId: "...", citationNumber: 1 }
   ```

5. **AI generates document structure** and calls `replaceContent` (client-side):

   ```typescript
   replaceContent({
     from: 0,
     to: 0,
     content: "= Quantum Computing Applications\n\n== Introduction\n\n...",
   });
   // Executes in browser, updates CodeMirror
   ```

6. **AI adds citations** using `addCitation` (client-side):

   ```typescript
   addCitation({
     position: 150,
     sourceId: "...",
     citationNumber: 1,
   });
   // Inserts: #footnote[1]
   ```

7. **AI saves document** using `saveDocument` (server-side):

   ```typescript
   saveDocument({
     documentId: "...",
     typstContent: editor.state.doc.toString(),
   });
   ```

8. **Server tracks tokens and adjusts credits**:
   - Reserved: 50 credits (estimated)
   - Actual usage: 42 credits
   - Refund: 8 credits
   - Final deduction: 42 credits

### Research Depth Configuration

```typescript
// packages/domain/src/research.ts
export type ResearchDepth = "quick" | "deep";

export const RESEARCH_DEPTH_CONFIG = {
  quick: {
    maxSources: 5,
    description: "3-5 sources, faster generation",
    estimatedTime: "30-60 seconds",
  },
  deep: {
    maxSources: 15,
    description: "10-15 sources, comprehensive research",
    estimatedTime: "2-3 minutes",
  },
} as const;
```

---

## 5. Success Criteria (Measurable)

- **SC-01**: AI responds to prompts within 10 seconds (excluding web search latency).
- **SC-02**: Streaming progress updates appear in real-time (<100ms latency).
- **SC-03**: AI-generated Typst syntax compiles without errors 95% of the time.
- **SC-04**: CodeMirror undo/redo works after AI edits.
- **SC-05**: Token usage is tracked for 100% of AI operations.
- **SC-06**: Credits are reserved before operations and adjusted after completion.
- **SC-07**: Users are blocked from AI operations when credits < estimated cost.
- **SC-08**: All server tools execute in single `/api/chat` endpoint (no separate routes).
- **SC-09**: Client tools access CodeMirror via EditorContext (no global state).

---

## 6. Edge Cases & Error Handling

### AI Errors

- **EC-01**: If Gemini API returns error, show user-friendly message and retry button.
- **EC-02**: If AI generates invalid Typst syntax, show compilation error (handled in Spec 3).
- **EC-03**: If AI times out (>30s), show partial results and allow retry.

### Tool Execution Errors

- **EC-04**: If webSearch fails (Tavily API error), inform user and suggest retry.
- **EC-05**: If querySourcesRAG fails (no sources found), inform user and suggest adding sources manually.
- **EC-06**: If saveDocument fails, queue for retry with exponential backoff.
- **EC-07**: If checkCredits fails, block operation and show error.

### Credit Errors

- **EC-08**: If user runs out of credits mid-operation, complete current operation but block future operations.
- **EC-09**: If credit deduction fails, log error and alert admin (don't block user).

### CodeMirror Errors

- **EC-10**: If edit position is out of bounds, clamp to document length.
- **EC-11**: If CodeMirror instance is not available, queue edits and apply when ready.

---

## 7. Implementation Checklist

### Setup

- [ ] Install dependencies: `@tanstack/ai`, `@tanstack/ai-react`, `@tanstack/ai-gemini`, `@tanstack/ai-openai`, `@tanstack/ai-anthropic`, `@tanstack/ai-ollama`
- [ ] Configure Google Gemini API key
- [ ] Configure Tavily API key
- [ ] Configure Google Embedding API key

### Tool Definitions

- [ ] Create `packages/ai-tools` package
- [ ] Define tool schemas (webSearch, addSource, querySourcesRAG, saveDocument, checkCredits, getNextCitationNumber)
- [ ] Define client tool schemas (replaceContent, insertContent, addCitation)
- [ ] Export all tool definitions from `packages/ai-tools/index.ts`

### API Endpoints

- [ ] Implement `/api/chat` endpoint with all server tool implementations
- [ ] Implement pessimistic credit locking before AI operations
- [ ] Implement token tracking and credit refund after operations
- [ ] Implement error handling with credit release

### Client Components

- [ ] Implement EditorContext and useEditor hook
- [ ] Implement TypstEditor component with EditorProvider
- [ ] Implement TypstChat component with client tool implementations
- [ ] Wire up client tools to CodeMirror via EditorContext

### Testing

- [ ] Unit tests for tool definitions
- [ ] E2E tests for AI chat flow
- [ ] E2E tests for credit deduction
- [ ] E2E tests for CodeMirror edits

---

## 8. Out of Scope

- Typst compilation (handled in Spec 3)
- Source metadata extraction (handled in Spec 4)
- UI components (handled in Spec 5)
- Template selection (handled in Spec 3)

---

## 9. Next Steps

After completing this spec:

1. Proceed to **Spec 3: Typst Document Engine & Templates**
2. Tools defined here will be used by AI to edit documents
3. Credit system will track all AI operations

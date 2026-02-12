---
name: tanstack-ai
description: Tool definitions, chat streaming, and server-side tool execution with TanStack AI. Use when implementing AI chat endpoints, creating tool definitions for LLM function calling, streaming responses with Server-Sent Events, integrating Google Gemini adapter, or tracking token usage for credit systems.
---

# TanStack AI Integration

Build AI-powered chat endpoints with type-safe tool calling, streaming responses, and token tracking.

## Overview

TanStack AI provides a framework-agnostic way to build AI features with:

- **Type-safe tool definitions** using Zod or JSON Schema
- **Isomorphic architecture** - Define once, implement on server or client
- **Streaming responses** with Server-Sent Events
- **Automatic tool execution** - Tools run automatically when called by LLM
- **Token tracking** - Monitor usage for credit/cost management
- **Multiple LLM providers** - Google Gemini, OpenAI, Anthropic, etc.

## Quick Start

### 1. Install Dependencies

```bash
npm install @tanstack/ai @tanstack/ai-google zod
# or
bun add @tanstack/ai @tanstack/ai-google zod
```

### 2. Define a Tool

```typescript
// tools/definitions.ts
import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

export const webSearchDef = toolDefinition({
  name: "webSearch",
  description: "Search the web for information",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    maxResults: z.number().optional().describe("Max results (default: 5)"),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        snippet: z.string(),
      }),
    ),
  }),
});
```

### 3. Implement Server Tool

```typescript
// tools/server.ts
import { webSearchDef } from "./definitions";

export const webSearch = webSearchDef.server(
  async ({ query, maxResults = 5 }) => {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: maxResults,
      }),
    });

    const data = await response.json();
    return { results: data.results };
  },
);
```

### 4. Create Chat Endpoint

```typescript
// app/api/chat/route.ts
import { chat, toServerSentEventsResponse } from "@tanstack/ai";
import { geminiText } from "@tanstack/ai-google";
import { auth } from "@clerk/nextjs/server";
import { webSearch } from "@/tools/server";

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await request.json();

  const stream = chat({
    adapter: geminiText("gemini-2.0-flash-thinking-exp"),
    messages,
    tools: [webSearch],
  });

  return toServerSentEventsResponse(stream);
}
```

## Core Concepts

### Tool Definition Pattern

TanStack AI uses a two-step process:

1. **Define** with `toolDefinition()` - Creates shared schema
2. **Implement** with `.server()` or `.client()` - Adds execution logic

This provides:

- Type safety from Zod schemas
- Code reuse across environments
- Flexibility for server/client execution

### Automatic Tool Execution

When the LLM calls a tool:

1. Server receives `tool_call` chunk
2. Arguments are parsed and validated
3. Tool's `execute` function runs automatically
4. Result is added to conversation
5. LLM continues with the result

**No manual handling required!**

### Streaming with AG-UI Protocol

TanStack AI implements the AG-UI Protocol for streaming:

- `RUN_STARTED` - Run begins
- `TEXT_MESSAGE_CONTENT` - Text streaming
- `TOOL_CALL_START/ARGS/END` - Tool invocation
- `STEP_STARTED/STEP_FINISHED` - Thinking/reasoning
- `RUN_FINISHED` - Completion with usage stats
- `RUN_ERROR` - Error occurred

## Common Patterns

### Pattern 1: Database Query Tool

```typescript
const getUserDataDef = toolDefinition({
  name: "getUserData",
  description: "Get user information from database",
  inputSchema: z.object({
    userId: z.string().uuid(),
  }),
  outputSchema: z.object({
    name: z.string(),
    email: z.string(),
  }),
});

const getUserData = getUserDataDef.server(async ({ userId }) => {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  return { name: user.name, email: user.email };
});
```

### Pattern 2: External API Tool

```typescript
const webSearchDef = toolDefinition({
  name: "webSearch",
  description: "Search the web",
  inputSchema: z.object({
    query: z.string(),
  }),
});

const webSearch = webSearchDef.server(async ({ query }) => {
  const response = await fetch("https://api.example.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.API_KEY}`,
    },
    body: JSON.stringify({ query }),
  });

  return await response.json();
});
```

### Pattern 3: Credit-Gated Tool

```typescript
const expensiveOperationDef = toolDefinition({
  name: "expensiveOperation",
  description: "Perform expensive operation",
  inputSchema: z.object({
    data: z.string(),
  }),
});

const expensiveOperation = expensiveOperationDef.server(async ({ data }) => {
  const { userId } = auth();

  // Check credits
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });

  if (!user || user.credits < 10) {
    throw new Error("Insufficient credits");
  }

  // Deduct credits
  await db
    .update(schema.users)
    .set({ credits: sql`credits - 10` })
    .where(eq(schema.users.id, userId));

  // Perform operation
  const result = await performOperation(data);
  return result;
});
```

### Pattern 4: Token Tracking

```typescript
export async function POST(request: Request) {
  const { userId } = auth();
  const { messages } = await request.json();

  let totalTokens = 0;

  const stream = chat({
    adapter: geminiText("gemini-2.0-flash-thinking-exp"),
    messages,
    tools,
  });

  const trackedStream = (async function* () {
    for await (const chunk of stream) {
      if (chunk.type === "RUN_FINISHED" && chunk.usage) {
        totalTokens = chunk.usage.totalTokens;
      }
      yield chunk;
    }

    // Deduct credits after completion
    if (totalTokens > 0) {
      const cost = Math.ceil(totalTokens / 1000);
      await deductCredits(userId, cost, totalTokens);
    }
  })();

  return toServerSentEventsResponse(trackedStream);
}
```

## Tool Organization

Organize tools by domain for maintainability:

```
packages/domain/src/tools/
├── index.ts              # Export all tools
├── search-tools.ts       # webSearch, etc.
├── document-tools.ts     # saveDocument, queryDocuments
├── source-tools.ts       # addSource, querySourcesRAG
└── credit-tools.ts       # checkCredits, etc.
```

## Error Handling

### Tool Errors

```typescript
const myTool = myToolDef.server(async ({ param }) => {
  try {
    const result = await operation(param);
    return result;
  } catch (error) {
    // LLM will see this error and can retry or inform user
    throw new Error(`Operation failed: ${error.message}`);
  }
});
```

### Stream Errors

```typescript
try {
  const stream = chat({ adapter, messages, tools });

  for await (const chunk of stream) {
    if (chunk.type === "RUN_ERROR") {
      console.error("Stream error:", chunk.error);
    }
  }
} catch (error) {
  console.error("Chat error:", error);
  return new Response("Internal server error", { status: 500 });
}
```

## Best Practices

1. **Keep tools focused** - One tool, one responsibility
2. **Use Zod schemas** - Get type safety and validation
3. **Add descriptions** - Help LLM understand when to use tools
4. **Handle errors gracefully** - Return meaningful error messages
5. **Log tool invocations** - Track usage and debug issues
6. **Validate inputs** - Don't trust LLM-generated parameters
7. **Secure sensitive operations** - Check permissions before executing
8. **Track token usage** - Monitor costs and implement limits

## Reference Documentation

For detailed information, see the reference files:

- **[Tool Patterns](./references/tool-patterns.md)** - Tool definition and implementation patterns
- **[Streaming](./references/streaming.md)** - Chat streaming and SSE patterns
- **[Token Tracking](./references/token-tracking.md)** - Usage monitoring and credit deduction
- **[Adapters](./references/adapters.md)** - Google Gemini configuration

## Next Steps

1. Define your tool schemas in `packages/domain/src/tools/`
2. Implement server tools with database/API access
3. Create `/api/chat` endpoint with tool array
4. Add token tracking for credit management
5. Test with various user queries

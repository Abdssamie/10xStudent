# TanStack AI Tool Patterns

## Tool Definition Structure

Tools are defined using `createTool()` and implemented with `.server()` for server-side execution.

### Basic Tool Definition

```typescript
import { createTool } from "@tanstack/ai";
import { z } from "zod";

export const myToolDef = createTool({
  id: "myTool",
  description:
    "Clear description for the LLM to understand when to use this tool",
  parameters: z.object({
    param1: z.string().describe("Description of parameter"),
    param2: z.number().optional().describe("Optional parameter"),
  }),
  execute: async () => {
    throw new Error("Must be implemented on server");
  },
});
```

**Key Points:**

- `id`: Unique identifier for the tool
- `description`: Critical - tells the LLM when to use this tool
- `parameters`: Zod schema with `.describe()` for each field
- `execute`: Placeholder that throws error (actual implementation is server-side)

### Server-Side Implementation

```typescript
// In API route (e.g., app/api/chat/route.ts)
import { myToolDef } from "@10xstudent/domain/tools";

const myTool = myToolDef.server(async ({ param1, param2 }) => {
  // Access authenticated user
  const { userId } = auth();

  // Perform server-side operations
  const result = await someServerOperation(param1, param2);

  // Return data to LLM
  return { success: true, data: result };
});
```

**Key Points:**

- Use `.server()` to implement the tool
- Parameters are destructured from the function argument
- Access server-only resources (database, auth, APIs)
- Return data that the LLM can use in its response

## Common Tool Patterns

### Pattern 1: Database Query Tool

```typescript
export const queryDataDef = createTool({
  id: "queryData",
  description: "Query database for specific information",
  parameters: z.object({
    query: z.string().describe("The search query"),
    limit: z.number().optional().describe("Max results (default: 10)"),
  }),
  execute: async () => {
    throw new Error("Must be implemented on server");
  },
});

// Server implementation
const queryData = queryDataDef.server(async ({ query, limit = 10 }) => {
  const results = await db.query.items.findMany({
    where: like(schema.items.content, `%${query}%`),
    limit,
  });

  return { results, count: results.length };
});
```

### Pattern 2: External API Tool

```typescript
export const webSearchDef = createTool({
  id: "webSearch",
  description: "Search the web for information",
  parameters: z.object({
    query: z.string().describe("The search query"),
    maxResults: z.number().optional().describe("Maximum results (default: 5)"),
  }),
  execute: async () => {
    throw new Error("Must be implemented on server");
  },
});

// Server implementation
const webSearch = webSearchDef.server(async ({ query, maxResults = 5 }) => {
  const response = await fetch("https://api.example.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, max_results: maxResults }),
  });

  const data = await response.json();
  return data.results;
});
```

### Pattern 3: Database Mutation Tool

```typescript
export const saveDocumentDef = createTool({
  id: "saveDocument",
  description: "Save document content to database",
  parameters: z.object({
    documentId: z.string().uuid().describe("The document ID"),
    content: z.string().describe("The content to save"),
  }),
  execute: async () => {
    throw new Error("Must be implemented on server");
  },
});

// Server implementation
const saveDocument = saveDocumentDef.server(async ({ documentId, content }) => {
  const { userId } = auth();

  // Verify ownership
  const doc = await db.query.documents.findFirst({
    where: eq(schema.documents.id, documentId),
  });

  if (!doc || doc.userId !== userId) {
    throw new Error("Document not found or unauthorized");
  }

  // Update document
  await db
    .update(schema.documents)
    .set({ content, updatedAt: new Date() })
    .where(eq(schema.documents.id, documentId));

  return { success: true };
});
```

### Pattern 4: Credit Check Tool

```typescript
export const checkCreditsDef = createTool({
  id: "checkCredits",
  description: "Check user's current credit balance",
  parameters: z.object({}), // No parameters needed
  execute: async () => {
    throw new Error("Must be implemented on server");
  },
});

// Server implementation
const checkCredits = checkCreditsDef.server(async () => {
  const { userId } = auth();

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });

  return {
    credits: user?.credits || 0,
    hasCredits: (user?.credits || 0) > 0,
  };
});
```

## Tool Organization

### Domain Package Structure

```
packages/domain/src/tools/
├── index.ts              # Export all tool definitions
├── search-tools.ts       # webSearch, etc.
├── document-tools.ts     # saveDocument, queryDocuments, etc.
├── source-tools.ts       # addSource, querySourcesRAG, etc.
└── credit-tools.ts       # checkCredits, etc.
```

### Exporting Tools

```typescript
// packages/domain/src/tools/index.ts
export * from "./search-tools";
export * from "./document-tools";
export * from "./source-tools";
export * from "./credit-tools";
```

## Error Handling

### Throwing Errors in Tools

```typescript
const myTool = myToolDef.server(async ({ param }) => {
  // Validation errors
  if (!param) {
    throw new Error("Parameter is required");
  }

  // Authorization errors
  if (!hasPermission) {
    throw new Error("Unauthorized");
  }

  // Business logic errors
  if (insufficientCredits) {
    throw new Error("Insufficient credits");
  }

  // External API errors
  try {
    const result = await externalAPI();
    return result;
  } catch (error) {
    throw new Error(`External API failed: ${error.message}`);
  }
});
```

**Key Points:**

- Errors are returned to the LLM, which can retry or inform the user
- Use clear, descriptive error messages
- The LLM will see the error and can adjust its approach

## Logging Tool Invocations

```typescript
import { logger } from "@10xstudent/logger";

const myTool = myToolDef.server(async ({ param }) => {
  const { userId } = auth();

  logger.info({ userId, param, toolName: "myTool" }, "Tool invoked");

  try {
    const result = await performOperation(param);

    logger.info(
      { userId, toolName: "myTool", success: true },
      "Tool completed",
    );

    return result;
  } catch (error) {
    logger.error(
      { userId, toolName: "myTool", error: error.message },
      "Tool failed",
    );
    throw error;
  }
});
```

## Testing Tools

### Manual Testing

```typescript
// Test tool definition exports correctly
import { myToolDef } from "@10xstudent/domain/tools";
console.log(myToolDef.id); // "myTool"

// Test server implementation (in API route)
const result = await myTool.execute({ param: "test" });
console.log(result);
```

### Integration Testing

Test tools through the chat endpoint:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Use myTool with param test"
      }
    ]
  }'
```

# Token Tracking and Usage Monitoring

TanStack AI provides usage information through the `RUN_FINISHED` event, which includes token counts and finish reasons.

## Usage Information

The `RUN_FINISHED` event contains usage statistics:

```typescript
{
  type: "RUN_FINISHED",
  finishReason: "stop" | "length" | "tool-calls" | "content-filter" | "error",
  usage: {
    promptTokens: number,
    completionTokens: number,
    totalTokens: number
  }
}
```

## Tracking Tokens in Server Routes

```typescript
import { chat, toServerSentEventsResponse } from "@tanstack/ai";
import { geminiText } from "@tanstack/ai-google";
import { auth } from "@clerk/nextjs/server";
import { db, schema, eq, sql } from "@10xstudent/database";
import { logger } from "@10xstudent/logger";

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await request.json();

  let totalTokens = 0;

  const stream = chat({
    adapter: geminiText("gemini-2.0-flash-thinking-exp"),
    messages,
    tools,
  });

  // Track tokens by intercepting the stream
  const trackedStream = (async function* () {
    for await (const chunk of stream) {
      // Capture usage from RUN_FINISHED event
      if (chunk.type === "RUN_FINISHED" && chunk.usage) {
        totalTokens = chunk.usage.totalTokens;

        logger.info(
          {
            userId,
            promptTokens: chunk.usage.promptTokens,
            completionTokens: chunk.usage.completionTokens,
            totalTokens: chunk.usage.totalTokens,
            finishReason: chunk.finish Reason,
          },
          "Chat completed"
        );
      }

      yield chunk;
    }

    // Deduct credits after stream completes
    if (totalTokens > 0) {
      const cost = Math.ceil(totalTokens / 1000);

      await db.transaction(async (tx) => {
        await tx
          .update(schema.users)
          .set({ credits: sql`credits - ${cost}` })
          .where(eq(schema.users.id, userId));

        await tx.insert(schema.creditLogs).values({
          userId,
          operation: "typst_generation",
          cost,
          tokensUsed: totalTokens,
        });
      });

      logger.info(
        { userId, cost, tokensUsed: totalTokens },
        "Credits deducted"
      );
    }
  })();

  return toServerSentEventsResponse(trackedStream);
}
```

## Pre-Flight Credit Check

Check credits before starting expensive operations:

```typescript
export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Check credits before processing
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });

  if (!user || user.credits < 1) {
    return new Response(JSON.stringify({ error: "Insufficient credits" }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages } = await request.json();

  // Continue with chat...
}
```

## Credit Deduction Patterns

### Pattern 1: Deduct After Completion

```typescript
let totalTokens = 0;

const stream = chat({ adapter, messages, tools });

const trackedStream = (async function* () {
  for await (const chunk of stream) {
    if (chunk.type === "RUN_FINISHED" && chunk.usage) {
      totalTokens = chunk.usage.totalTokens;
    }
    yield chunk;
  }

  // Deduct after stream completes
  if (totalTokens > 0) {
    await deductCredits(userId, totalTokens);
  }
})();

return toServerSentEventsResponse(trackedStream);
```

### Pattern 2: Deduct Per Tool Call

```typescript
const webSearch = webSearchDef.server(async ({ query }) => {
  // Deduct fixed cost for web search
  await db
    .update(schema.users)
    .set({ credits: sql`credits - 1` })
    .where(eq(schema.users.id, userId));

  await db.insert(schema.creditLogs).values({
    userId,
    operation: "web_search",
    cost: 1,
    tokensUsed: null,
  });

  // Perform search
  const results = await tavilySearch(query);
  return results;
});
```

### Pattern 3: Estimate and Reserve

```typescript
// Estimate cost based on message length
const estimatedTokens = messages.reduce(
  (suum + msg.content.length / 4,
  0
);
const estimatedCost = Math.ceil(estimatedTokens / 1000);

// Check if user has enough credits
if (user.credits < estimatedCost) {
  return new Response("Insufficient credits", { status: 402 });
}

// Reserve credits (optional)
await db
  .update(schema.users)
  .set({ credits: sql`credits - ${estimatedCost}` })
  .where(eq(schema.users.id, userId));

// Process chat and refund difference if needed
```

## Logging Token Usage

```typescript
import { logger } from "@10xstudent/logger";

// Log token usage for analytics
logger.info(
  {
    userId,
    operation: "chat_completion",
    model: "gemini-2.0-flash-thinking-exp",
    promptTokens: chunk.usage.promptTokens,
    completionTokens: chunk.usage.completionTokens,
    totalTokens: chunk.usage.totalTokens,
    finishReason: chunk.finishReason,
    cost,
    timestamp: new Date().toISOString(),
  },
  "Token usage tracked",
);
```

## Credit Cost Constants

```typescript
// packages/domain/src/lib/credit-costs.ts
export const CREDIT_COSTS = {
  // Token-based costs
  TYPST_GENERATION: (tokens: number) => Math.ceil(tokens / 1000),

  // Fixed costs
  WEB_SEARCH: 1,
  RAG_QUERY: 0, // Free
  SAVE_DOCUMENT: 0, //
  // Per-operation costs
  IMAGE_GENERATION: 10,
  PDF_EXPORT: 2,
} as const;

export type CreditOperation = keyof typeof CREDIT_COSTS;
```

## Client-Side Credit Display

```typescript
import { useQuery } from "@tanstack/react-query";

function CreditDisplay() {
  const { data: credits } = useQuery({
    queryKey: ["credits"],
    queryFn: async () => {
      const response = await fetch("/api/credits");
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  return (
    <div>
      Credits: {credits?.credits || 0}
      {credits?.credits < 100 && (
        <span className="text-red-500">Low credits!</span>
      )}
    </div>
  );
}
```

## Finish Reasons

The `finishReason` field indicates why the generation stopped:

- `"stop"` - Natural completion
- `"length"` - Hit max token limit
- `"tool-calls"` - Stopped to execute tools
- `"content-filter"` - Content filtered by provider
- `"error"` - Error occurred

```typescript
if (chunk.type === "RUN_FINISHED") {
  switch (chunk.finishReason) {
    case "stop":
      // Normal completion
      break;
    case "length":
      logger.warn({ userId }, "Response truncated due to length");
      break;
    case "content-filter":
      logger.warn({ userId }, "Content filtered");
      break;
    case "error":
      logger.error({ userId }, "Generation error");
      break;
  }
}
```

## Best Practices

1. **Always track tokens** - Log usage for analytics and debugging
2. **Deduct after completion** - Only charge for actual usage
3. **Handle errors gracefully** - Don't charge if generation fails
4. **Log credit operations** - Maintain audit trail
5. **Show credit balance** - Keep users informed
6. **Set reasonable limits** - Prevent abuse with rate limiting
7. **Refund on errors** - Return credits if operation fails

## Error Handling

```typescript
try {
  const stream = chat({ adapter, messages, tools });

  const trackedStream = (async function* () {
    try {
      for await (const chunk of stream) {
        if (chunk.type === "RUN_FINISHED" && chunk.usage) {
          totalTokens = chunk.usage.totalTokens;
        }
        yield chunk;
      }

      // Deduct credits on success
      if (totalTokens > 0) {
        await deductCredits(userId, totalTokens);
      }
    } catch (error) {
      logger.error({ userId, error }, "Stream error");
      // Don't deduct credits on error
      throw error;
    }
  })();

  return toServerSentEventsResponse(trackedStream);
} catch (error) {
  logger.error({ userId, error }, "Chat error");
  return new Response("Internal server error", { status: 500 });
}
```

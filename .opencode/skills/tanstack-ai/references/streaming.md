# TanStack AI Streaming Patterns

## Chat Streaming with Server-Sent Events

TanStack AI uses Server-Sent Events (SSE) to stream chat responses in real-time.

## Basic Chat Endpoint

```typescript
// app/api/chat/route.ts
import { chat } from "@tanstack/ai";
import { geminiText } from "@tanstack/ai-google";
import { toServerSentEventsResponse } from "@tanstack/ai/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  // Authenticate user
  const { userId } = auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Parse request body
  const { messages } = await request.json();

  // Create chat stream
  const stream = chat({
    adapter: geminiText("gemini-2.0-flash-thinking-exp"),
    messages,
  });

  // Return SSE response
  return toServerSentEventsResponse(stream);
}
```

**Key Points:**

- Use `chat()` to create a streaming response
- `adapter` specifies the LLM provider (Google Gemini)
- `messages` is an array of chat messages
- `toServerSentEventsResponse()` converts to SSE format

## Chat with Tools

```typescript
import { chat } from "@tanstack/ai";
import { geminiText } from "@tanstack/ai-google";
import { toServerSentEventsResponse } from "@tanstack/ai/server";
import { auth } from "@clerk/nextjs/server";
import {
  webSearchDef,
  saveDocumentDef,
  checkCreditsDef,
} from "@10xstudent/domain/tools";

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await request.json();

  // Implement server tools
  const webSearch = webSearchDef.server(async ({ query, maxResults }) => {
    // Implementation here
    return results;
  });

  const saveDocument = saveDocumentDef.server(
    async ({ documentId, content }) => {
      // Implementation here
      return { success: true };
    },
  );

  const checkCredits = checkCreditsDef.server(async () => {
    // Implementation here
    return { credits: 1000 };
  });

  // Create chat stream with tools
  const stream = chat({
    adapter: geminiText("gemini-2.0-flash-thinking-exp"),
    messages,
    tools: [webSearch, saveDocument, checkCredits],
  });

  return toServerSentEventsResponse(stream);
}
```

**Key Points:**

- Implement tools with `.server()` before passing to `chat()`
- Pass array of tools to `tools` option
- LLM will automatically call tools based on user messages
- Tool results are streamed back to the client

## Message Format

```typescript
// Request body format
{
  "messages": [
    {
      "role": "user",
      "content": "Search for information about TypeScript"
    },
    {
      "role": "assistant",
      "content": "I'll search for that information."
    },
    {
      "role": "user",
      "content": "Now save it to document abc-123"
    }
  ]
}
```

**Message Roles:**

- `user`: User's message
- `assistant`: AI's response
- `system`: System instructions (optional)
- `tool`: Tool execution results (handled automatically)

## Adapter Configuration

### Google Gemini

```typescript
import { geminiText } from "@tanstack/ai-google";

const stream = chat({
  adapter: geminiText("gemini-2.0-flash-thinking-exp", {
    apiKey: process.env.GOOGLE_API_KEY,
  }),
  messages,
});
```

**Available Models:**

- `gemini-2.0-flash-thinking-exp` - Fast, thinking mode
- `gemini-1.5-pro` - More capable, slower
- `gemini-1.5-flash` - Fast, less capable

### Configuration Options

```typescript
const stream = chat({
  adapter: geminiText("gemini-2.0-flash-thinking-exp", {
    apiKey: process.env.GOOGLE_API_KEY,
    temperature: 0.7, // Creativity (0-1)
    maxTokens: 2000, // Max response length
    topP: 0.9, // Nucleus sampling
  }),
  messages,
  tools,
});
```

## Client-Side Consumption

### Using TanStack Query

```typescript
import { useChat } from "@tanstack/react-ai";

function ChatComponent() {
  const { messages, sendMessage, isLoading } = useChat({
    api: "/api/chat",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}

      <button onClick={() => sendMessage("Hello!")}>
        Send
      </b>
    </div>
  );
}
```

### Manual Fetch with EventSource

```typescript
async function streamChat(messages: Message[]) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n")n    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));
        console.log("Received:", data);
      }
    }
  }
}
```

## Error Handling

### Server-Side Errors

```typescript
export async function POST(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages } = await request.json();

    const stream = chat({
      adapter: geminiText("gemini-2.0-flash-thinking-exp"),
      messages,
      tools,
    });

    return toServerSentEventsResponse(stream);
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

### Tool Execution Errors

When a tool throws an error, the LLM receives the error message and can:

1. Retry with different parameters
2. Try a different approach
3. Inform the user about the error

```typescript
const myTool = myToolDef.server(async ({ param }) => {
  if (!param) {
    // LLM will see this error and can retry
    throw new Error("Parameter is required");
  }

  try {
    return await performOperation(param);
  } catch (error) {
    // LLM will see this error and can inform user
    throw new Error(`Operation failed: ${error.message}`);
  }
});
```

## Streaming Progress Updates

### Custom Progress Messages

```typescript
const stream = chat({
  adapter: geminiText("gemini-2.0-flash-thinking-exp"),
  messages,
  tools,
  onChunk: (chunk) => {
    // Log each chunk for debugging
    console.log("Chunk:", chunk);
  },
});
```

### Tool Execution Progress

Tools exe synchronously within the stream. The LLM will:

1. Decide to call a tool
2. Stream "Calling tool X..."
3. Execute the tool
4. Stream the tool result
5. Continue generating response

## Performance Optimization

### Debouncing Client Requests

```typescript
import { useDebouncedCallback } from "use-debounce";

const debouncedSend = useDebouncedCallback(
  (message: string) => {
    sendMessage(message);
  },
  500, // Wait 500ms after user stops typing
);
```

### Limiting Message History

```typescript
const { messages } = await request.json();

// Keep only last 10 messages to reduce token usage
const recentMessages = messages.slice(-10);

const stream = chat({
  adapter: geminiText("gemini-2.0-flash-thinking-exp"),
  messages: recentMessages,
  tools,
});
```

### Streaming Timeout

```typescript
export async function POST(request: Request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const stream = chat({
      adapter: geminiText("gemini-2.0-flash-thinking-exp"),
      messages,
      tools,
      signal: controller.snal,
    });

    return toServerSentEventsResponse(stream);
  } finally {
    clearTimeout(timeout);
  }
}
```

## Testing Streaming

### Manual Testing with curl

```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ]
  }'
```

The `-N` flag disables buffering to see streaming in real-time.

### Testing Tool Calls

```bash
curl -N -X POST http://localho:3000/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Search the web for TypeScript tutorials"
      }
    ]
  }'
```

You should see the LLM call the `webSearch` tool and stream the results.

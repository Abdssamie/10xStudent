# Google Gemini Adapter

TanStack AI supports Google Gemini models through the `@tanstack/ai-google` package.

## Installation

```bash
npm install @tanstack/ai-google
# or
bun add @tanstack/ai-google
```

## Basic Usage

```typescript
import { chat } from "@tanstack/ai";
import { geminiText } from "@tanstack/ai-google";

const stream = chat({
  adapter: geminiText("gemini-2.0-flash-thinking-exp"),
  messages: [{ role: "user", content: "Hello!" }],
});
```

## Available Models

### Gemini 2.0 Flash (Thinking)

```typescript
geminiText("gemini-2.0-flash-thinking-exp");
```

**Features:**

- Fast inference
- Thinking/reasoning mode
- Streaming support
- Tool calling support
- Cost-effective

**Best for:** Real-time chat, document generation, tool-heavy workflows

### Gemini 1.5 Pro

```typescript
geminiText("gemini-1.5-pro");
```

**Features:**

- More capable than Flash
- Larger context window
- Better reasoning
- Higher cost

**Best for:** Complex reasoning, long documents, detailed analysis

### Gemini 1.5 Flash

```typescript
geminiText("gemini-1.5-flash");
```

**Features:**

- Fast and efficient
- Good balance of speed and capability
- Lower cost than Pro

**Best for:** General-purpose tasks, quick responses

## Configuration

### API Key

Set your Google API key as an environment variable:

```bash
GOOGLE_API_KEY=your_api_key_here
```

Or pass it directly:

```typescript
const stream = chat({
  adapter: geminiText("gemini-2.0-flash-thinking-exp", {
    apiKey: process.env.GOOGLE_API_KEY,
  }),
  messages,
});
```

### Model Parameters

```typescript
const stream = chat({
  adapter: geminiText("gemini-2.0-flash-thinking-exp", {
    apiKey: process.env.GOOGLE_API_KEY,
    temperature: 0.7, // Creativity (0-1)
    maxTokens: 2000, // Max response length
    topP: 0.9, // Nucleus sampling
    topK: 40, // Top-K sampling
  }),
  messages,
  tools,
});
```

### Parameter Descriptions

- **temperature** (0-1): Controls randomness. Higher = more creative, lower = more deterministic
- **maxTokens**: Maximum number of tokens in the response
- **topP** (0-1): Nucleus sampling threshold. Lower = more focused
- **topK**: Number of top tokens to consider. Lower = more focused

## Thinking Mode

Gemini 2.0 Flash Thinking models provide reasoning steps before the final answer:

```typescript
const stream = chat({
  adapter: geminiText("gemini-2.0-flash-thinking-exp"),
  messages: [{ role: "user", content: "Solve this complex problem..." }],
});

for await (const chunk of stream) {
  if (chunk.type === "STEP_FINISHED") {
    console.log("Thinking:", chunk.content);
  }
  if (chunk.type === "TEXT_MESSAGE_CONTENT") {
    console.log("Response:", chunk.delta);
  }
}
```

**Thinking chunks:**

- Streamed separately from final response
- Provide insight into model's reasoning
- Automatically converted to `ThinkingPart` in UI messages
- Not sent back to the model in conversation history

## Tool Calling

Gemini models support function calling:

```typescript
import { chat } from "@tanstack/ai";
import { geminiText } from "@tanstack/ai-google";
import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

const getWeatherDef = toolDefinition({
  name: "get_weather",
  description: "Get current weather",
  inputSchema: z.object({
    location: z.string(),
  }),
});

const getWeather = getWeatherDef.server(async ({ location }) => {
  // Fetch weather data
  return { temperature: 72, conditions: "sunny" };
});

const stream = chat({
  adapter: geminiText("gemini-2.0-flash-thinking-exp"),
  messages: [{ role: "user", content: "What's the weather in SF?" }],
  tools: [getWeather],
});
```

## Error Handling

```typescript
try {
  const stream = chat({
    adapter: geminiText("gemini-2.0-flash-thinking-exp"),
    messages,
  });

  for await (const chunk of stream) {
    if (chunk.type === "RUN_ERROR") {
      console.error("Error:", chunk.error);
    }
  }
} catch (error) {
  if (error.message.includes("API key")) {
    console.error("Invalid API key");
  } else if (error.message.includes("quota")) {
    console.error("API quota exceeded");
  } else {
    console.error("Unknown error:", error);
  }
}
```

## Rate Limiting

Google Gemini API has rate limits:

- **Free tier**: 15 requests per minute
- **Paid tier**: Higher limits based on plan

Handle rate limits gracefully:

```typescript
async function chatWithRetry(messages, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const stream = chat({
        adapter: geminiText("gemini-2.0-flash-thinking-exp"),
        messages,
      });
      return stream;
    } catch (error) {
      if (error.message.includes("429") && i < maxRetries - 1) {
        // Wait before retrying
  wait new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
}
```

## Best Practices

1. **Use environment variables** for API keys
2. **Set appropriate temperature** - Lower for factual tasks, higher for creative tasks
3. **Limit max tokens** - Prevent excessive costs
4. **Handle errors gracefully** - Check for rate limits and invalid keys
5. **Use thinking mode** - For complex reasoning tasks
6. **Monitor usage** - Track token consumption for cost management

## Cost Optimization

```typescript
// Use Flash for simple tasks
const stream = chat({
  adapter: geminiText("gemini-1.5-flash"),
  messages,
});

// Use Pro only when needed
const complexStream = chat({
  adapter: geminiText("gemini-1.5-pro"),
  messages: complexMessages,
});

// Limit response length
const stream = chat({
  adapter: geminiText("gemini-2.0-flash-thinking-exp", {
    maxTokens: 500, // Limit to 500 tokens
  }),
  messages,
});
```

## Next Steps

- [Streaming](./streaming) - Learn about streaming responses
- [Tool Patterns](./tool-patterns) - Implement server tools
- [Token Tracking](./token-tracking) - Monitor usage and costs

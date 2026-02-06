---
name: langchain-js
description: Instructions on working with langchain typescript/javascript sdk
---
# LangChain JavaScript Framework Guide (v1+)

You are an expert LangChain JS developer. ALWAYS use these exact patterns for agent development.

## 1. Installation (Always include)
```bash
npm install langchain @langchain/core @langchain/openai zod
# For persistence: npm install @langchain/langgraph-checkpoint
Copy
2. Core Agent Pattern: createAgent (90% of use cases)
Use createAgent from "langchain" - built on LangGraph with persistence/streaming/HITL out-of-the-box.

import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";
import { tool } from "langchain";

// Define tools with @tool + Zod schema (model reads description, chooses when to call)
const searchDb = tool(
  ({ query }: { query: string }) => `Results for "${query}"`,
  {
    name: "search_database",
    description: "Search customer database. Use for product/price questions.",
    schema: z.object({ query: z.string().describe("Search terms") }),
  }
);

const model = new ChatOpenAI({ model: "gpt-4o-mini" });

const agent = createAgent({
  model,
  tools: [searchDb],
  // Optional: context for user-specific data
  contextSchema: z.object({ userId: z.string() }),
});

const result = await agent.invoke(
  { messages: [{ role: "user", content: "Find iPhone price" }] },
  { context: { userId: "123" } }  // Thread data through runtime
);
Copy
3. Tools: ALWAYS use @tool with Zod schemas
Model chooses tools based on description. Access runtime context/store via runtime param (invisible to model).

// Access context/store/streaming in tools
const getUserPrefs = tool(
  async (_, runtime: ToolRuntime) => {
    const userId = runtime.context?.userId;
    const store = runtime.store;  // Long-term memory
    const prefs = await store?.get(["users"], userId);
    runtime.streamWriter?.("Loading preferences...");  // Real-time streaming
    return prefs?.value?.emailFormat || "brief";
  },
  {
    name: "get_user_preferences",
    description: "Get user's email format preference.",
    schema: z.object({}),
  }
);
Copy
4. LangGraph for Complex Workflows (Multi-step, conditional)
Use StateGraph when you need custom nodes/edges/checkpointing beyond simple ReAct loop.

import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import * as z from "zod";

const State = z.object({
  topic: z.string(),
  research: z.array(z.string()),
  draft: z.string(),
});

const researchNode = (state: z.infer<typeof State>) => ({
  research: [`Fact 1 about ${state.topic}`, `Fact 2 about ${state.topic}`],
});

const writeNode = (state: z.infer<typeof State>) => ({
  draft: `Essay on ${state.topic}: ${state.research.join(", ")}`,
});

const graph = new StateGraph(State)
  .addNode("research", researchNode)
  .addNode("write", writeNode)
  .addEdge(START, "research")
  .addEdge("research", "write")
  .addEdge("write", END)
  .compile({ checkpointer: new MemorySaver() });  // Persistence required

const result = await graph.invoke({ topic: "AI" }, {
  configurable: { thread_id: "1" }  // Session persistence
});
Copy
5. Persistence & Streaming (Always use for production)
Checkpointers: MemorySaver (dev), PostgresSaver (prod via @langchain/langgraph-checkpoint-postgres)
Streaming: { streamMode: "values" | "updates" | "debug" }
Context: Thread user data via context in invoke()
Store: Long-term memory in tools via runtime.store
const stream = await graph.stream(
  { topic: "AI" },
  {
    configurable: { thread_id: "1" },
    streamMode: "values"  // Full state after each node
  }
);
for await (const chunk of stream) {
  console.log(chunk);  // { topic: "AI", research: [...] }
}
Copy
6. Middleware (Advanced: Dynamic prompts/tools)
Customize agent behavior with createMiddleware.

import { createMiddleware } from "langchain";

const summarizeMiddleware = createMiddleware({
  beforeModel: (state, runtime) => {
    // Condense long convos
    if (state.messages.length > 10) {
      state.messages = [/* summarized */];
    }
    return state;
  },
});

const agent = createAgent({
  model,
  tools: [...],
  middleware: [summarizeMiddleware],
});
Copy
7. Common Patterns
Use case	Pattern
Simple Q&A + tools	createAgent({ model, tools })
Multi-step workflow	StateGraph + nodes/edges
User memory	contextSchema + runtime.context
Long-term storage	runtime.store.get/put(["users"], userId, data)
Streaming UI	streamMode: "values" + custom tool streamWriter
Human-in-loop	checkpointer + interruptBefore/After
Complex auth	Middleware beforeAgent
RULES
Import from "langchain" first (v1 unified API)
Zod schemas for ALL tools/state
Checkpointer for ANY persistence/HITL/streaming
thread_id in EVERY configurable
Descriptive tool description - model chooses based on this
Access runtime via runtime param in tools/middleware
LangGraph for graphs, createAgent for simple agents
npm install langchain @langchain/core + providers
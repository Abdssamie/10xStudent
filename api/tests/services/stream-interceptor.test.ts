import { describe, it, expect } from "vitest";

/**
 * Test utilities for async generator stream interception
 * Used to test the createTrackedStream pattern in AgentService
 */

/**
 * Mock chunk types that match TanStack AI stream format
 */
type TextChunk = {
  type: "TEXT_MESSAGE_CONTENT";
  text: string;
};

type RunFinishedChunk = {
  type: "RUN_FINISHED";
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
};

type StreamChunk = TextChunk | RunFinishedChunk;

/**
 * Create a mock stream generator for testing
 */
async function* createMockStream(chunks: StreamChunk[]): AsyncGenerator<StreamChunk> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

/**
 * Async generator wrapper that intercepts stream chunks
 * This pattern is used in AgentService.streamChatResponse
 */
async function* createTrackedStream(
  stream: AsyncGenerator<StreamChunk>,
  onTokensTracked: (tokens: number) => void
): AsyncGenerator<StreamChunk> {
  let totalTokens = 0;

  try {
    for await (const chunk of stream) {
      if (chunk.type === "RUN_FINISHED" && chunk.usage) {
        totalTokens = chunk.usage.totalTokens;
      }
      yield chunk;
    }

    // After stream completes, call callback with total tokens
    if (totalTokens > 0) {
      onTokensTracked(totalTokens);
    }
  } catch (error) {
    // Handle errors in stream
    throw error;
  }
}

/**
 * Helper to consume entire stream and collect chunks
 */
async function consumeStream<T>(stream: AsyncGenerator<T>): Promise<T[]> {
  const chunks: T[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return chunks;
}

describe("Async Generator Stream Interceptor", () => {
  describe("createTrackedStream", () => {
    it("should intercept and track token usage from stream", async () => {
      // Arrange
      const mockChunks: StreamChunk[] = [
        { type: "TEXT_MESSAGE_CONTENT", text: "Hello" },
        { type: "TEXT_MESSAGE_CONTENT", text: " world" },
        {
          type: "RUN_FINISHED",
          usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
          finishReason: "stop",
        },
      ];

      let trackedTokens = 0;
      const onTokensTracked = (tokens: number) => {
        trackedTokens = tokens;
      };

      // Act
      const mockStream = createMockStream(mockChunks);
      const trackedStream = createTrackedStream(mockStream, onTokensTracked);
      const chunks = await consumeStream(trackedStream);

      // Assert
      expect(chunks).toHaveLength(3);
      expect(trackedTokens).toBe(30);
      expect(chunks[0]).toEqual({ type: "TEXT_MESSAGE_CONTENT", text: "Hello" });
      expect(chunks[1]).toEqual({ type: "TEXT_MESSAGE_CONTENT", text: " world" });
      expect(chunks[2]).toMatchObject({ type: "RUN_FINISHED", finishReason: "stop" });
    });

    it("should not call callback when no tokens are used", async () => {
      // Arrange
      const mockChunks: StreamChunk[] = [
        { type: "TEXT_MESSAGE_CONTENT", text: "Hello" },
        {
          type: "RUN_FINISHED",
          usage: undefined, // No usage data
          finishReason: "error",
        },
      ];

      let callbackCalled = false;
      const onTokensTracked = () => {
        callbackCalled = true;
      };

      // Act
      const mockStream = createMockStream(mockChunks);
      const trackedStream = createTrackedStream(mockStream, onTokensTracked);
      await consumeStream(trackedStream);

      // Assert
      expect(callbackCalled).toBe(false);
    });

    it("should handle stream errors correctly", async () => {
      // Arrange
      async function* errorStream(): AsyncGenerator<StreamChunk> {
        yield { type: "TEXT_MESSAGE_CONTENT", text: "Hello" };
        throw new Error("Stream error");
      }

      const onTokensTracked = () => {
        // Should not be called
      };

      // Act & Assert
      const trackedStream = createTrackedStream(errorStream(), onTokensTracked);
      
      await expect(async () => {
        await consumeStream(trackedStream);
      }).rejects.toThrow("Stream error");
    });

    it("should track tokens from multiple RUN_FINISHED chunks (last one wins)", async () => {
      // Arrange
      const mockChunks: StreamChunk[] = [
        { type: "TEXT_MESSAGE_CONTENT", text: "First" },
        {
          type: "RUN_FINISHED",
          usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
          finishReason: "continue",
        },
        { type: "TEXT_MESSAGE_CONTENT", text: "Second" },
        {
          type: "RUN_FINISHED",
          usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
          finishReason: "stop",
        },
      ];

      let trackedTokens = 0;
      const onTokensTracked = (tokens: number) => {
        trackedTokens = tokens;
      };

      // Act
      const mockStream = createMockStream(mockChunks);
      const trackedStream = createTrackedStream(mockStream, onTokensTracked);
      await consumeStream(trackedStream);

      // Assert - Last RUN_FINISHED chunk's tokens should be tracked
      expect(trackedTokens).toBe(30);
    });

    it("should pass through all chunks unchanged", async () => {
      // Arrange
      const mockChunks: StreamChunk[] = [
        { type: "TEXT_MESSAGE_CONTENT", text: "A" },
        { type: "TEXT_MESSAGE_CONTENT", text: "B" },
        { type: "TEXT_MESSAGE_CONTENT", text: "C" },
        {
          type: "RUN_FINISHED",
          usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
          finishReason: "stop",
        },
      ];

      const onTokensTracked = () => {};

      // Act
      const mockStream = createMockStream(mockChunks);
      const trackedStream = createTrackedStream(mockStream, onTokensTracked);
      const chunks = await consumeStream(trackedStream);

      // Assert - All chunks should be passed through
      expect(chunks).toEqual(mockChunks);
    });
  });

  describe("Stream consumption patterns", () => {
    it("should handle empty stream", async () => {
      // Arrange
      const mockChunks: StreamChunk[] = [];
      let callbackCalled = false;

      // Act
      const mockStream = createMockStream(mockChunks);
      const trackedStream = createTrackedStream(mockStream, () => {
        callbackCalled = true;
      });
      const chunks = await consumeStream(trackedStream);

      // Assert
      expect(chunks).toHaveLength(0);
      expect(callbackCalled).toBe(false);
    });

    it("should handle stream with only text chunks", async () => {
      // Arrange
      const mockChunks: StreamChunk[] = [
        { type: "TEXT_MESSAGE_CONTENT", text: "Hello" },
        { type: "TEXT_MESSAGE_CONTENT", text: " world" },
      ];

      let trackedTokens = 0;

      // Act
      const mockStream = createMockStream(mockChunks);
      const trackedStream = createTrackedStream(mockStream, (tokens) => {
        trackedTokens = tokens;
      });
      const chunks = await consumeStream(trackedStream);

      // Assert
      expect(chunks).toHaveLength(2);
      expect(trackedTokens).toBe(0); // No RUN_FINISHED chunk
    });
  });
});

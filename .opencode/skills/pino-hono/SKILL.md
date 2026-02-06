---
name: pino-hono
description: Use when implementing structured logging in Hono applications with Pino. Covers request logging, context enrichment, child loggers, and integration with Hono middleware patterns.
---

# Pino Structured Logging with Hono

## Overview

This skill provides patterns for integrating Pino structured logging into Hono applications. Pino is a fast, low-overhead JSON logger that works well with Hono's middleware system for request logging, error tracking, and context enrichment.

**Use this skill when:**

- Setting up logging in a Hono API application
- Adding request IDs and context to logs
- Implementing structured logging for debugging and monitoring
- Integrating Pino with Hono middleware

## Quick Start

### Installation

```bash
npm install pino pino-http hono
```

### Basic Setup with Hono

```typescript
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { pinoHttp } from "pino-http";

const app = new Hono();

// Add request ID middleware
app.use(requestId());

// Add Pino logging middleware
app.use(async (c, next) => {
  // Pass hono's request-id to pino-http
  c.env.incoming.id = c.var.requestId;

  // Map express-style middleware to hono
  await new Promise((resolve) =>
    pinoHttp()(c.env.incoming, c.env.outgoing, () => resolve()),
  );

  // Make logger available in context
  c.set("logger", c.env.incoming.log);

  await next();
});

app.get("/", (c) => {
  c.var.logger.info("something");
  return c.text("Hello Node.js!");
});

serve(app);
```

## Core Patterns

### Pattern 1: Request Logging with Context

Add request-specific context to all logs:

```typescript
import { createMiddleware } from "hono/factory";
import pino from "pino";

// Create base logger
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

// Middleware to add logger to context
const loggerMiddleware = createMiddleware<{
  Variables: {
    logger: pino.Logger;
    requestId: string;
  };
}>(async (c, next) => {
  const requestId = c.get("requestId") || crypto.randomUUID();

  // Create child logger with request context
  const requestLogger = logger.child({
    requestId,
    method: c.req.method,
    path: c.req.path,
  });

  c.set("logger", requestLogger);

  requestLogger.info("Request started");

  await next();

  requestLogger.info(
    {
      status: c.res.status,
      duration: Date.now() - startTime,
    },
    "Request completed",
  );
});

app.use(loggerMiddleware);

app.get("/api/users/:id", (c) => {
  const logger = c.get("logger");
  const userId = c.req.param("id");

  logger.info({ userId }, "Fetching user");

  // ... fetch user logic

  return c.json({ user });
});
```

### Pattern 2: Child Loggers for Operations

Create child loggers for specific operations:

```typescript
app.post("/api/documents", async (c) => {
  const logger = c.get("logger");
  const body = await c.req.json();

  // Create child logger for this operation
  const docLogger = logger.child({
    operation: "createDocument",
    documentType: body.type,
  });

  docLogger.info("Starting document creation");

  try {
    const document = await createDocument(body);
    docLogger.info(
      { documentId: document.id },
      "Document created successfully",
    );
    return c.json(document, 201);
  } catch (error) {
    docLogger.error({ error }, "Document creation failed");
    throw error;
  }
});
```

### Pattern 3: Error Logging

Log errors with full context:

```typescript
app.onError((err, c) => {
  const logger = c.get("logger");

  logger.error(
    {
      err,
      requestId: c.get("requestId"),
      method: c.req.method,
      path: c.req.path,
      userId: c.get("userId"), // if available from auth middleware
    },
    "Request error",
  );

  return c.json(
    {
      error: "Internal Server Error",
      requestId: c.get("requestId"),
    },
    500,
  );
});
```

### Pattern 4: User Context Enrichment

Add user information from auth middleware:

```typescript
const authMiddleware = createMiddleware<{
  Variables: {
    logger: pino.Logger;
    userId: string;
  };
}>(async (c, next) => {
  const userId = await getUserIdFromToken(c);

  // Enrich logger with user context
  const userLogger = c.get("logger").child({ userId });
  c.set("logger", userLogger);
  c.set("userId", userId);

  await next();
});

app.use("/api/*", authMiddleware);
```

### Pattern 5: Structured Data Logging

Log structured data for easy querying:

``escript
app.post('/api/credits/deduct', async (c) => {
const logger = c.get('logger');
const { userId, amount, operation } = await c.req.json();

logger.info({
event: 'credit_deduction',
userId,
amount,
operation,
timestamp: new Date().toISOString(),
}, 'Credits deducted');

// ... deduct credits logic

return c.json({ success: true });
});

````

## Configuration

### Production Configuration

```typescript
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Redact sensitive fields
  redact: {
    paths: ['req.headers.authorization', 'password', 'apiKey'],
    remove: true,
  },
});
````

### Development Configuration

```typescript
const logger = pino({
  level: "debug",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname",
    },
  },
});
```

## Common Patterns for Spec 0

### Credit System Logging

```typescript
export async function deductCredits(
  userId: string,
  amount: number,
  optring,
  logger: pino.Logger,
) {
  const opLogger = logger.child({
    operation: "deductCredits",
    userId,
    amount,
    creditOperation: operation,
  });

  opLogger.info("Starting credit deduction");

  try {
    const result = await db.transaction(async (tx) => {
      // ... deduction logic
    });

    opLogger.info(
      {
        remainingCredits: result.remainingCredits,
      },
      "Credits deducted successfully",
    );

    return result;
  } catch (error) {
    opLogger.error({ error }, "Credit deduction failed");
    throw error;
  }
}
```

### LLM Token Tracking

```typescript
app.post("/api/chat", async (c) => {
  const logger = c.get("logger");
  const userId = c.get("userId");

  logger.info({ userId }, "Chat request started");

  const stream = await generateChatResponse(prompt, {
    onFinish: (usage) => {
      logger.info(
        {
          event: "llm_usage",
          userId,
          model: "gemini-1.5-flash",
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          creditsDeducted: Math.ceil(usage.totalTokens / 1000),
        },
        "LLM request completed",
      );
    },
  });

  return c.body(stream);
});
```

ctices

1. **Always use child loggers** - Create child loggers for operations to maintain context
2. **Log structured data** - Use objects for log data, not string concatenation
3. **Include request IDs** - Always include request ID for tracing
4. **Redact sensitive data** - Configure redaction for passwords, tokens, API keys
5. **Use appropriate log levels**:
   - `error`: Errors that need immediate attention
   - `warn`: Potential issues or degraded functionality
   - `info`: Important business events (user actions, credit deductions)
   - `debug`: Detailed debugging information
   - `trace`: Very detailed debugging (usually disabled in production)

## Common Mistakes

### ❌ String Concatenation

```typescript
// Bad
logger.info(`User ${userId} deducted ${amount} credits`);
```

### ✅ Structured Logging

```typescript
// Good
logger.info({ userId, amount }, "Credits deducted");
```

### ❌ Logging Sensitive Data

```typescript
// Bad
logger.info({ password, apiKey }, "User authenticated");
```

### ✅ Redacting Sensitive Data

```typescript
// Good - configure redaction
const logger = pino({
  redact: ["password", "apiKey", "req.headers.authorization"],
});
```

### ❌ Not Using Child Loggers

```ty/ Bad - loses context
logger.info('Operation started');
// ... many lines later
logger.info('Operation completed'); // Which operation?
```

### ✅ Using Child Loggers

```typescript
// Good - maintains context
const opLogger = logger.child({ operation: "createDocument", documentId });
opLogger.info("Operation started");
// ... many lines later
opLogger.info("Operation completed"); // Clear which operation
```

## Related Skills

- **hono-api-patterns** - For Hono middleware and route organization
- **tanstack-ai** - For logging LLM token usage and costs

## Quick Reference

ript
// Create logger
const logger = pino({ level: 'info' });

// Child logger
const childLogger = logger.child({ userId, requestId });

// Log levels
logger.trace('Very detailed');
logger.debug('Debug info');
logger.info('Important event');
logger.warn('Warning');
logger.error('Error occurred');
logger.fatal('Fatal error');

// Structured logging
logger.info({ userId, amount }, 'Credits deducted');

// Error logging
logger.error({ err: error }, 'Operation failed');

```

```

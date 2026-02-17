// Import Sentry first to ensure proper instrumentation
import { Sentry } from './lib/sentry';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { appRouter } from './routes/app';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { sentryContext } from './middleware/sentry-context';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
    credentials: true,
}));

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date() }));

// Protected Routes (with rate limiting)
appRouter.use("/*", authMiddleware);
appRouter.use("/*", sentryContext);

// Mount main application router
app.route('/', appRouter);

// Error handling middleware (must be last)
app.onError((err, c) => {
  // Capture error in Sentry before formatting response
  Sentry.captureException(err, {
    contexts: {
      request: {
        method: c.req.method,
        url: c.req.url,
        headers: Object.fromEntries(c.req.raw.headers.entries()),
      },
    },
    user: c.get('auth')?.userId ? {
      id: c.get('auth').userId,
    } : undefined,
  });

  // Let error-handler middleware format the response
  return errorHandler(err, c);
});

export default {
    port: 3001,
    fetch: app.fetch
};

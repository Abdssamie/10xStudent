// CRITICAL: Import Sentry instrumentation FIRST before any other imports
import "./instrument.js";

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { apiReference } from '@scalar/hono-api-reference';
import { env } from './config/env';
import { appRouter } from './routes/app';
import { webhooksRouter } from './routes/webhooks';
import { errorHandler } from './middleware/error-handler';
import { createServicesMiddleware } from './middleware/services';
import { createServiceContainer } from './services/container';
import { constructApiRoute } from './utils/router';
import { db } from './infrastructure/db';
import { closeRedis } from './lib/redis';
import { logger as appLogger } from './utils/logger';

const app = new Hono();

// Create service container
const services = createServiceContainer(db);

app.use('*', logger());
app.use('*', cors({
    origin: env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
    credentials: true,
}));

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date() }));

// Debug route to test Sentry error tracking (remove in production)
if (env.NODE_ENV !== 'production') {
  app.get('/debug-sentry', (c) => {
    throw new Error('Test Sentry error - this is intentional!');
  });
}

// OpenAPI documentation UI (public, no auth required)
app.get(
  '/reference',
  apiReference({
    url: '/api/v1/doc',
  })
);

// Webhooks (no auth required, but needs services)
app.use(constructApiRoute('/webhooks') + '/*', createServicesMiddleware(services));
app.route(constructApiRoute('/webhooks'), webhooksRouter);

// Mount main application router (middleware applied in app.ts)
app.route('/', appRouter);

// Error handling middleware (must be last)
app.onError(errorHandler);

// Graceful shutdown handler
process.on('SIGTERM', async () => {
    appLogger.info('SIGTERM received, closing connections');
    await closeRedis();
    process.exit(0);
});

process.on('SIGINT', async () => {
    appLogger.info('SIGINT received, closing connections');
    await closeRedis();
    process.exit(0);
});

export default {
    port: 3001,
    fetch: app.fetch
};

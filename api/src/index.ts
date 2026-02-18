// Import Sentry first to ensure proper instrumentation
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { appRouter } from './routes/app';
import { webhooksRouter } from './routes/webhooks';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { sentryContext } from './middleware/sentry-context';
import { createServicesMiddleware } from './middleware/services';
import { createServiceContainer } from './services/container';
import { constructApiRoute } from './utils/router';
import { db } from './infrastructure/db';
import { redis, closeRedis } from './lib/redis';
import { createDefaultRateLimiter } from './middleware/rate-limit';

const app = new Hono();

// Create service container
const services = createServiceContainer(db);

app.use('*', logger());
app.use('*', cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
    credentials: true,
}));

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date() }));

// Webhooks (no auth required, but needs services)
app.route(constructApiRoute('/webhooks'), webhooksRouter);
webhooksRouter.use("/*", createServicesMiddleware(services));

// Protected Routes (with auth, rate limiting, services, and Sentry context)
appRouter.use("/*", authMiddleware);
appRouter.use("/*", createDefaultRateLimiter(redis));
appRouter.use("/*", createServicesMiddleware(services));
appRouter.use("/*", sentryContext);

// Mount main application router
app.route('/', appRouter);

// Error handling middleware (must be last)
app.onError(errorHandler);

// Graceful shutdown handler
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing connections...');
    await closeRedis();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, closing connections...');
    await closeRedis();
    process.exit(0);
});

export default {
    port: 3001,
    fetch: app.fetch
};

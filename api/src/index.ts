// Import Sentry first to ensure proper instrumentation
import { Sentry } from './lib/sentry';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { appRouter } from './routes/app';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { sentryContext } from './middleware/sentry-context';
import { createServicesMiddleware } from './middleware/services';
import { createServiceContainer } from './services/container';
import { db } from './database';

const app = new Hono();

// Create service container
const services = createServiceContainer(db);

app.use('*', logger());
app.use('*', cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
    credentials: true,
}));

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date() }));

// Protected Routes (with auth, services, and Sentry context)
appRouter.use("/*", authMiddleware);
appRouter.use("/*", createServicesMiddleware(services));
appRouter.use("/*", sentryContext);

// Mount main application router
app.route('/', appRouter);

// Error handling middleware (must be last)
app.onError(errorHandler);

export default {
    port: 3001,
    fetch: app.fetch
};

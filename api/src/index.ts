import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { appRouter } from './routes/app';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
    credentials: true,
}));

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date() }));

// Protected Routes (with rate limiting)
appRouter.use("/*", authMiddleware);

// Mount main application router
app.route('/', appRouter);

// Error handling middleware (must be last)
app.onError(errorHandler);

export default {
    port: 3001,
    fetch: app.fetch
};

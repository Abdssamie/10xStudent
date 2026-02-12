import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { appRouter } from './routes/app';
import { webhooksRouter } from './routes/webhooks';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
}));

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date() }));

// Mount webhooks router (before auth middleware)
app.route('/webhooks', webhooksRouter);

// Mount main application router
app.route('/', appRouter);

export default {
    port: 3001,
    fetch: app.fetch
};


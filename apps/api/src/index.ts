import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { appRouter } from './routes/app';

/**
 * @id: api-server
 * @priority: high
 * @progress: 80
 * @spec: Hono server instance. Configures CORS, Logger, and Base Routes.
 * @skills: ["hono", "typescript"]
 */

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date() }));

// Mount main application router
app.route('/', appRouter);

export default {
    port: 3000,
    fetch: app.fetch
};


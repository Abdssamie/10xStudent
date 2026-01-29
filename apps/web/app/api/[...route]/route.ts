import { Hono } from 'hono'
import { handle } from 'hono/vercel'

// Initialize Hono app
const app = new Hono().basePath('/api')

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Placeholder for future API routes
app.get('/', (c) => {
  return c.json({
    message: '10xStudent API',
    version: '1.0.0',
    endpoints: ['/health'],
  })
})

// Export handlers for Next.js App Router
export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)

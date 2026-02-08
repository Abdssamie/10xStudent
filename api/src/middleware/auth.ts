import { createMiddleware } from 'hono/factory';
import { clerkClient } from '@clerk/clerk-sdk-node';

/**
 * @id: auth-middleware
 * @priority: high
 * @progress: 80
 * @spec: Hono middleware to verify Clerk sessions. Sets c.set('user', user) and c.set('auth', auth).
 * @skills: ["hono", "clerk"]
 */

declare module 'hono' {
    interface ContextVariableMap {
        auth: {
            userId: string;
            sessionId: string;
        };
    }
}

export const authMiddleware = createMiddleware(async (c, next) => {
    const authHeader = c.req.header('Authorization');

    // Public routes bypass (optional, but handled by where middleware is applied)
    // if (c.req.path.includes('/health')) return next();

    if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ error: 'Missing bearer token' }, 401);
    }

    const token = authHeader.split(' ')[1];

    try {
        const verified = await clerkClient.verifyToken(token);

        c.set('auth', {
            userId: verified.sub,
            sessionId: verified.sid,
        });

        await next();
    } catch (error) {
        return c.json({ error: 'Invalid token' }, 401);
    }
});


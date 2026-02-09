import { createMiddleware } from 'hono/factory';
import { clerkClient } from '@clerk/clerk-sdk-node';

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

    if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ error: 'Missing bearer token' }, 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return c.json({ error: 'Missing bearer token' }, 401);
    }

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


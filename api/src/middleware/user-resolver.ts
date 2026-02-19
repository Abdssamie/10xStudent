import { createMiddleware } from 'hono/factory';
import { schema, eq } from '@/infrastructure/db';
import { logger } from '@/utils/logger';
import { UnauthorizedError, InternalServerError } from '@/infrastructure/errors';

const { users } = schema;

declare module 'hono' {
    interface ContextVariableMap {
        user: {
            id: string;
            clerkId: string;
        };
    }
}

export const userResolverMiddleware = createMiddleware(async (c, next) => {
    const auth = c.get('auth');
    
    if (!auth?.userId) {
        throw new UnauthorizedError('No auth context');
    }
    
    const clerkId = auth.userId;
    const services = c.get('services');
    const db = services?.db;

    if (!db) {
        throw new InternalServerError('Database unavailable');
    }

    const result = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
    const user = result[0];

    if (!user) {
        logger.error({ clerkId }, 'User not found in database');
        throw new UnauthorizedError('User not found. Please ensure webhook is configured.');
    }

    c.set('user', {
        id: user.id,
        clerkId: user.clerkId,
    });

    await next();
});

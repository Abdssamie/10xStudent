import { createMiddleware } from 'hono/factory';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { logger } from '@/utils/logger';
import { UnauthorizedError } from '@/infrastructure/errors';
import type { ServiceContainer } from '@/services/container';

declare module 'hono' {
    interface ContextVariableMap {
        auth: {
            userId: string;
            sessionId: string;
            orgId?: string;
        };
        services: ServiceContainer;
    }
}

/**
 * Modern Clerk authentication middleware for Hono
 * Verifies JWT tokens from Clerk and extracts user context
 */
export const authMiddleware = createMiddleware(async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedError(
            'Missing or invalid Authorization header. Expected format: Bearer <token>'
        );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
        throw new UnauthorizedError('Token is empty');
    }

    try {
        // Verify the session token with Clerk
        const verified = await clerkClient.verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
        });

        // Extract user context from verified token
        c.set('auth', {
            userId: verified.sub,
            sessionId: verified.sid,
            orgId: verified.org_id,
        });

        await next();
    } catch (error) {
        logger.error({ error }, 'Token verification failed');
        throw new UnauthorizedError('Invalid or expired token');
    }
});


/**
 * src/utils/mock-auth.ts
 *
 * Mock authentication middleware for local development when AUTH_JWKS_URI is
 * not configured.
 *
 * Behaviour:
 * - Sets a synthetic authenticated user on every request so that
 *   `c.get('user')` is always populated.
 * - Randomly denies access with a 403 on ~30 % of requests to simulate
 *   missing-permission scenarios without a real auth provider.
 *
 * Never use this in production.
 */

import { HTTPException } from 'hono/http-exception';
import type { MiddlewareHandler } from 'hono';
import { logger } from './logger.js';

const MOCK_USER = {
  sub: 'mock-user',
  email: 'mock@localhost',
  organisation_id: 'mock-org',
  permissions: ['records:read', 'admin:manage'],
};

/** Probability (0–1) that a request is randomly denied. */
const DENY_PROBABILITY = 0.0;

export function createMockAuthMiddleware(): MiddlewareHandler {
  logger.warn(
    'Mock authentication middleware is active — AUTH_JWKS_URI is not set. Do not use in production.'
  );

  return async (c, next) => {
    c.set('user', MOCK_USER);

    if (Math.random() < DENY_PROBABILITY) {
      throw new HTTPException(403, {
        message: 'Mock auth: randomly denied (simulated missing permissions)',
      });
    }

    await next();
  };
}

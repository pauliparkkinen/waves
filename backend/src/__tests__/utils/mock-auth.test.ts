import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const mockLogger = {
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
};

vi.mock('../../utils/logger.js', () => ({ logger: mockLogger }));

describe('createMockAuthMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('given the middleware is created', () => {
    it('when created, then a warning is logged', async () => {
      const { createMockAuthMiddleware } = await import('../../utils/mock-auth.js');
      createMockAuthMiddleware();

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('AUTH_JWKS_URI'));
    });
  });

  describe('given Math.random always returns above the deny threshold', () => {
    it('when a request is made, then the user is set on the context and the handler is called', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(1);
      const { createMockAuthMiddleware } = await import('../../utils/mock-auth.js');
      const app = new Hono();
      app.use('*', createMockAuthMiddleware());
      app.get('/test', (c) => {
        const user = c.get('user');
        return c.json(user);
      });

      const res = await app.request('http://localhost/test');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toMatchObject({
        sub: 'mock-user',
        email: 'mock@localhost',
        permissions: expect.arrayContaining(['records:read']),
      });
    });
  });

  describe('given Math.random always returns below the deny threshold (0)', () => {
    it('when DENY_PROBABILITY is 0, then the request succeeds (no random denial)', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const { createMockAuthMiddleware } = await import('../../utils/mock-auth.js');
      const app = new Hono();
      app.use('*', createMockAuthMiddleware());
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('http://localhost/test');

      // DENY_PROBABILITY is 0.0, so Math.random() < 0 is never true
      expect(res.status).toBe(200);
    });
  });
});

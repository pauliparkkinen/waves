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

  describe('given Math.random always returns below the deny threshold', () => {
    it('when a request is made, then it returns 403', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const { createMockAuthMiddleware } = await import('../../utils/mock-auth.js');
      const app = new Hono();
      app.use('*', createMockAuthMiddleware());
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('http://localhost/test');

      expect(res.status).toBe(403);
    });

    it('when a request is made, then the user is still set on the context before the denial', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const { createMockAuthMiddleware } = await import('../../utils/mock-auth.js');
      let capturedUser: unknown;
      const app = new Hono();
      app.use('*', createMockAuthMiddleware());
      // onError runs after the HTTPException is thrown, by which point c.get('user') is already set
      app.onError((err, c) => {
        capturedUser = c.get('user');
        return c.json({ error: 'denied' }, 403);
      });
      app.get('/test', (c) => c.json({ ok: true }));

      await app.request('http://localhost/test');

      expect(capturedUser).toMatchObject({ sub: 'mock-user' });
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
};

vi.mock('../../utils/logger.js', () => ({ logger: mockLogger }));

describe('createRequestLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('given a Hono app with the request logger middleware', () => {
    it('when a GET request is handled successfully, then info is logged with method, url, status, and durationMs', async () => {
      const { createRequestLogger } = await import('../../utils/request-logger.js');
      const app = new Hono();
      app.use('*', createRequestLogger());
      app.get('/hello', (c) => c.json({ ok: true }));

      const res = await app.request('http://localhost/hello');

      expect(res.status).toBe(200);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          req: expect.objectContaining({ method: 'GET', url: expect.stringContaining('/hello') }),
          res: expect.objectContaining({ status: 200 }),
          durationMs: expect.any(Number),
        })
      );
    });

    it('when a request is received, then debug is logged with the request details before the handler runs', async () => {
      const { createRequestLogger } = await import('../../utils/request-logger.js');
      const app = new Hono();
      app.use('*', createRequestLogger());
      app.get('/ping', (c) => c.text('pong'));

      await app.request('http://localhost/ping');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          req: expect.objectContaining({ method: 'GET', url: expect.stringContaining('/ping') }),
        })
      );
    });

    it('when the request includes an authorization header, then debug logs the header value (redacted by pino at sink level)', async () => {
      const { createRequestLogger } = await import('../../utils/request-logger.js');
      const app = new Hono();
      app.use('*', createRequestLogger());
      app.get('/secure', (c) => c.json({ ok: true }));

      await app.request('http://localhost/secure', {
        headers: { authorization: 'Bearer my-token' },
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          req: expect.objectContaining({
            headers: expect.objectContaining({ authorization: 'Bearer my-token' }),
          }),
        })
      );
    });

    it('when the downstream handler throws an error, then Hono handles it internally and info is logged with status 500', async () => {
      const { createRequestLogger } = await import('../../utils/request-logger.js');
      const app = new Hono();
      app.use('*', createRequestLogger());
      app.get('/boom', () => {
        throw new Error('boom');
      });

      const res = await app.request('http://localhost/boom');

      // Hono's compose catches handler errors via its own onError callback,
      // resolving next() normally — so our catch block never runs and we log
      // the final status (500) via info, not error.
      expect(res.status).toBe(500);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          req: expect.objectContaining({ method: 'GET' }),
          res: expect.objectContaining({ status: 500 }),
          durationMs: expect.any(Number),
        })
      );
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('when a 404 route is hit, then info is logged with status 404', async () => {
      const { createRequestLogger } = await import('../../utils/request-logger.js');
      const app = new Hono();
      app.use('*', createRequestLogger());

      const res = await app.request('http://localhost/not-found');

      expect(res.status).toBe(404);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          res: expect.objectContaining({ status: 404 }),
        })
      );
    });
  });
});

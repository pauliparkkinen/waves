import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const mockServe = vi.fn();
const mockCreateApp = vi.fn();

vi.mock('@hono/node-server', () => ({
  serve: mockServe,
}));

vi.mock('../app.js', () => ({
  createApp: mockCreateApp,
}));

describe('main', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateApp.mockResolvedValue(new Hono());
    mockServe.mockImplementation((_opts: unknown, cb: (info: { port: number }) => void) => {
      cb({ port: 3000 });
    });
  });

  describe('given the server is not running', () => {
    it('when main is called, then createApp is invoked and serve is called with the app fetch handler', async () => {
      const { main } = await import('../index.js');
      await main();

      expect(mockCreateApp).toHaveBeenCalledOnce();
      expect(mockServe).toHaveBeenCalledWith(
        expect.objectContaining({ fetch: expect.any(Function), port: expect.any(Number) }),
        expect.any(Function)
      );
    });
  });

  describe('given PORT environment variable is set', () => {
    it('when main is called, then serve is started on the specified port', async () => {
      process.env.PORT = '4000';
      try {
        const { main } = await import('../index.js');
        await main();

        expect(mockServe).toHaveBeenCalledWith(
          expect.objectContaining({ port: 4000 }),
          expect.any(Function)
        );
      } finally {
        delete process.env.PORT;
      }
    });
  });

  describe('given a server startup error occurs', () => {
    it('when createApp rejects, then main propagates the error', async () => {
      mockCreateApp.mockRejectedValueOnce(new Error('startup failure'));

      const { main } = await import('../index.js');
      await expect(main()).rejects.toThrow('startup failure');
    });
  });
});

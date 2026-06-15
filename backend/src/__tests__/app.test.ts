import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

vi.mock('../module-loader.js', () => ({
  loadModules: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../config.js', () => ({
  loadConfig: vi.fn().mockReturnValue({ modules: '*' }),
}));

describe('createApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('given no config is provided', () => {
    it('when createApp is called, then it loads config from waves.config.json and returns a Hono app', async () => {
      const { loadConfig } = await import('../config.js');
      const { loadModules } = await import('../module-loader.js');
      vi.mocked(loadConfig).mockReturnValue({ modules: '*' });

      const { createApp } = await import('../app.js');
      const app = await createApp();

      expect(app).toBeInstanceOf(Hono);
      expect(loadConfig).toHaveBeenCalledOnce();
      expect(loadModules).toHaveBeenCalledOnce();
    });
  });

  describe('given an explicit config is provided', () => {
    it('when createApp is called with a module list, then loadConfig is skipped and loadModules receives the given config', async () => {
      const { loadConfig } = await import('../config.js');
      const { loadModules } = await import('../module-loader.js');
      const config = { modules: ['test'] as string[] };

      const { createApp } = await import('../app.js');
      const app = await createApp(config);

      expect(app).toBeInstanceOf(Hono);
      expect(loadConfig).not.toHaveBeenCalled();
      expect(loadModules).toHaveBeenCalledWith(
        expect.any(Hono),
        expect.stringContaining('modules'),
        config
      );
    });
  });

  describe('given a wildcard config is provided', () => {
    it('when createApp is called, then loadModules is called with the wildcard config', async () => {
      const { loadModules } = await import('../module-loader.js');
      const config = { modules: '*' as const };

      const { createApp } = await import('../app.js');
      await createApp(config);

      expect(loadModules).toHaveBeenCalledWith(expect.any(Hono), expect.any(String), config);
    });
  });
});

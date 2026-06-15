import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

vi.mock('node:fs');

describe('loadModules', () => {
  const modulesDir = '/fake/modules';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('given a wildcard config', () => {
    it('when modules directory has two subdirectories with index files, then both are mounted on the app', async () => {
      const { readdirSync, statSync, existsSync } = await import('node:fs');
      vi.mocked(readdirSync).mockImplementation(((path: string) => {
        if (path === modulesDir) return ['foo', 'bar'];
        return [];
      }) as typeof readdirSync);
      vi.mocked(statSync).mockReturnValue({ isDirectory: () => true } as ReturnType<
        typeof statSync
      >);
      vi.mocked(existsSync).mockImplementation((path) => String(path).endsWith('index.ts'));

      const fooRouter = new Hono();
      const barRouter = new Hono();
      const importer = vi.fn().mockImplementation((url: string) => {
        if (url.includes('foo')) return Promise.resolve({ default: fooRouter });
        if (url.includes('bar')) return Promise.resolve({ default: barRouter });
        return Promise.reject(new Error('unknown url'));
      });

      const app = new Hono();
      const routeSpy = vi.spyOn(app, 'route');

      const { loadModules } = await import('../module-loader.js');
      await loadModules(app, modulesDir, { modules: '*' }, importer);

      expect(importer).toHaveBeenCalledTimes(2);
      expect(routeSpy).toHaveBeenCalledWith('/foo', fooRouter);
      expect(routeSpy).toHaveBeenCalledWith('/bar', barRouter);
    });
  });

  describe('given a specific module list config', () => {
    it('when only "foo" is listed, then only /foo is mounted and /bar is skipped', async () => {
      const { readdirSync, statSync, existsSync } = await import('node:fs');
      vi.mocked(readdirSync).mockImplementation(((path: string) => {
        if (path === modulesDir) return ['foo', 'bar'];
        return [];
      }) as typeof readdirSync);
      vi.mocked(statSync).mockReturnValue({ isDirectory: () => true } as ReturnType<
        typeof statSync
      >);
      vi.mocked(existsSync).mockImplementation((path) => String(path).endsWith('index.ts'));

      const fooRouter = new Hono();
      const importer = vi.fn().mockResolvedValue({ default: fooRouter });

      const app = new Hono();
      const routeSpy = vi.spyOn(app, 'route');

      const { loadModules } = await import('../module-loader.js');
      await loadModules(app, modulesDir, { modules: ['foo'] }, importer);

      expect(routeSpy).toHaveBeenCalledWith('/foo', fooRouter);
      expect(routeSpy).toHaveBeenCalledTimes(1);
      expect(importer).not.toHaveBeenCalledWith(expect.stringContaining('bar'));
    });
  });

  describe('given a wildcard config', () => {
    it('when modules directory does not exist, then no routes are mounted and no error is thrown', async () => {
      const { readdirSync, statSync, existsSync } = await import('node:fs');
      vi.mocked(readdirSync).mockImplementation(() => {
        throw new Error('ENOENT');
      });
      vi.mocked(statSync).mockReturnValue({ isDirectory: () => true } as ReturnType<
        typeof statSync
      >);
      vi.mocked(existsSync).mockReturnValue(false);

      const importer = vi.fn();
      const app = new Hono();
      const routeSpy = vi.spyOn(app, 'route');

      const { loadModules } = await import('../module-loader.js');
      await expect(
        loadModules(app, modulesDir, { modules: '*' }, importer)
      ).resolves.toBeUndefined();

      expect(routeSpy).not.toHaveBeenCalled();
      expect(importer).not.toHaveBeenCalled();
    });
  });

  describe('given a wildcard config', () => {
    it('when a module index does not export a default Hono instance, then the route is not mounted', async () => {
      const { readdirSync, statSync, existsSync } = await import('node:fs');
      vi.mocked(readdirSync).mockImplementation(((path: string) => {
        if (path === modulesDir) return ['broken'];
        return [];
      }) as typeof readdirSync);
      vi.mocked(statSync).mockReturnValue({ isDirectory: () => true } as ReturnType<
        typeof statSync
      >);
      vi.mocked(existsSync).mockImplementation((path) => String(path).endsWith('index.ts'));

      const importer = vi.fn().mockResolvedValue({ default: { notAHono: true } });

      const app = new Hono();
      const routeSpy = vi.spyOn(app, 'route');

      const { loadModules } = await import('../module-loader.js');
      await loadModules(app, modulesDir, { modules: '*' }, importer);

      expect(routeSpy).not.toHaveBeenCalled();
    });
  });

  describe('given a wildcard config', () => {
    it('when a module has no index.ts or index.js, then it is skipped', async () => {
      const { readdirSync, statSync, existsSync } = await import('node:fs');
      vi.mocked(readdirSync).mockImplementation(((path: string) => {
        if (path === modulesDir) return ['empty'];
        return [];
      }) as typeof readdirSync);
      vi.mocked(statSync).mockReturnValue({ isDirectory: () => true } as ReturnType<
        typeof statSync
      >);
      vi.mocked(existsSync).mockReturnValue(false);

      const importer = vi.fn();
      const app = new Hono();
      const routeSpy = vi.spyOn(app, 'route');

      const { loadModules } = await import('../module-loader.js');
      await loadModules(app, modulesDir, { modules: '*' }, importer);

      expect(routeSpy).not.toHaveBeenCalled();
      expect(importer).not.toHaveBeenCalled();
    });
  });
});

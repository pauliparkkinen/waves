import { Hono } from 'hono';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ModuleConfig } from './config.js';
import { logger } from './utils/logger.js';

export type Importer = (url: string) => Promise<{ default: unknown }>;

export async function loadModules(
  app: Hono,
  modulesDir: string,
  config: ModuleConfig,
  importer: Importer = (url) => import(url)
): Promise<void> {
  let allModuleNames: string[];

  try {
    allModuleNames = readdirSync(modulesDir).filter((name: string) =>
      statSync(join(modulesDir, name)).isDirectory()
    );
  } catch {
    logger.warn({ modulesDir }, 'Modules directory not found or unreadable');
    return;
  }

  const moduleNames =
    config.modules === '*'
      ? allModuleNames
      : allModuleNames.filter((name) => (config.modules as string[]).includes(name));

  for (const moduleName of moduleNames) {
    const indexTs = join(modulesDir, moduleName, 'index.ts');
    const indexJs = join(modulesDir, moduleName, 'index.js');
    const indexPath = existsSync(indexTs) ? indexTs : existsSync(indexJs) ? indexJs : null;

    if (!indexPath) {
      logger.warn({ moduleName }, 'Module has no index.ts or index.js, skipping');
      continue;
    }

    try {
      const mod = await importer(pathToFileURL(indexPath).href);
      const router = mod.default;

      if (router && typeof (router as Hono).fetch === 'function') {
        app.route(`/${moduleName}`, router as Hono);
        logger.info({ moduleName }, `Loaded module: /${moduleName}`);
      } else {
        logger.warn({ moduleName }, 'Module index does not export a default Hono instance');
      }
    } catch (err) {
      logger.error({ moduleName, err }, `Failed to load module ${moduleName}`);
    }
  }
}

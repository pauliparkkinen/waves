import { Hono } from 'hono';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { loadConfig, type ModuleConfig } from './config.js';
import type {} from './types/auth.types.js';
import { logger } from './utils/logger.js';
import { createRequestLogger } from './utils/request-logger.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export async function createApp(config?: ModuleConfig): Promise<Hono> {
  const app = new Hono();

  app.use('*', createRequestLogger());

  const resolvedConfig = config ?? loadConfig(resolve(__dirname, '../waves.config.json'));

  // JWT authentication middleware — activated when AUTH_JWKS_URI is set.
  // Validates Bearer tokens and populates c.get('user') for downstream handlers.
  // Falls back to a mock middleware in local development when the env var is absent.
  const jwksUri = process.env.AUTH_JWKS_URI;
  if (jwksUri) {
    const { createJwtMiddleware } = await import('./utils/auth.js');
    app.use('*', createJwtMiddleware(jwksUri));
    logger.info('JWT authentication middleware enabled');
  } else {
    const { createMockAuthMiddleware } = await import('./utils/mock-auth.js');
    app.use('*', createMockAuthMiddleware());
  }

  const modulesDir = resolve(__dirname, '../modules');

  const { loadModules } = await import('./module-loader.js');
  await loadModules(app, modulesDir, resolvedConfig);

  return app;
}

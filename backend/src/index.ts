import { serve } from '@hono/node-server';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';

export async function main(): Promise<void> {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const app = await createApp();

  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      logger.info({ port: info.port }, `Server running at http://localhost:${info.port}`);
    }
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => logger.fatal({ err }, 'Fatal startup error'));
}

/**
 * src/utils/request-logger.ts
 *
 * Hono middleware that logs every inbound request and its response.
 *
 * Logged fields:
 *   req  – method, url, and safe headers (authorization is redacted by pino)
 *   res  – status code and duration in milliseconds
 *
 * Errors that propagate out of the middleware chain (bypassing Hono's own
 * compose error handler) are logged at the 'error' level and re-thrown.
 */

import type { MiddlewareHandler } from 'hono';
import { logger } from './logger.js';

export function createRequestLogger(): MiddlewareHandler {
  return async (c, next) => {
    const start = Date.now();
    const { method } = c.req;
    const url = c.req.url;

    logger.debug({
      req: {
        method,
        url,
        headers: {
          authorization: c.req.header('authorization'),
          'content-type': c.req.header('content-type'),
          'user-agent': c.req.header('user-agent'),
        },
      },
    });

    try {
      await next();
    } catch (err) {
      logger.error({
        req: { method, url },
        err,
        durationMs: Date.now() - start,
      });
      throw err;
    }

    logger.info({
      req: { method, url },
      res: { status: c.res.status },
      durationMs: Date.now() - start,
    });
  };
}

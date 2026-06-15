/**
 * src/utils/logger.ts
 *
 * Application logger — structured JSON output via pino.
 *
 * CONFIGURATION (environment variables)
 * LOG_LEVEL  – minimum log level: trace | debug | info | warn | error | fatal (default: info)
 * LOG_PRETTY – set to "true" for human-readable output (development only)
 *
 * REDACTION
 * Any field path listed in REDACTED_FIELDS is replaced with "[REDACTED]" in
 * every log entry before it is written. Add sensitive field names here to
 * prevent them from leaking into log sinks.
 *
 * To add more fields, extend the REDACTED_FIELDS array below.
 */

import pino from 'pino';

/**
 * Field paths redacted from all log output.
 * Paths follow pino's dot-notation: 'req.headers.authorization', 'body.password', etc.
 */
export const REDACTED_FIELDS: string[] = [
  'req.headers.authorization',
  'req.headers.cookie',
  'password',
  'token',
  'secret',
  'accessToken',
  'refreshToken',
  'idToken',
  'creditCard',
  'ssn',
];

const isDev = process.env.LOG_PRETTY === 'true';
const level = process.env.LOG_LEVEL ?? 'info';

export const logger = pino({
  level,
  redact: {
    paths: REDACTED_FIELDS,
    censor: '[REDACTED]',
  },
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      }
    : {}),
});

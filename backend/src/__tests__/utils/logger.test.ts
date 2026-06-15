import { describe, it, expect } from 'vitest';
import { Writable } from 'node:stream';
import pino from 'pino';
import { REDACTED_FIELDS, logger } from '../../utils/logger.js';

describe('REDACTED_FIELDS', () => {
  describe('given the logger configuration', () => {
    it('when REDACTED_FIELDS is inspected, then it includes common sensitive field names', () => {
      expect(REDACTED_FIELDS).toContain('req.headers.authorization');
      expect(REDACTED_FIELDS).toContain('req.headers.cookie');
      expect(REDACTED_FIELDS).toContain('password');
      expect(REDACTED_FIELDS).toContain('token');
      expect(REDACTED_FIELDS).toContain('accessToken');
      expect(REDACTED_FIELDS).toContain('refreshToken');
      expect(REDACTED_FIELDS).toContain('idToken');
    });
  });
});

describe('logger', () => {
  describe('given the logger instance', () => {
    it('when the logger is imported, then it exposes the standard pino log methods', () => {
      expect(typeof logger.trace).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.fatal).toBe('function');
    });
  });
});

describe('logger redaction', () => {
  function makeTestLogger() {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk, _enc, cb) {
        lines.push(chunk.toString().trim());
        cb();
      },
    });
    const testLogger = pino(
      { level: 'trace', redact: { paths: REDACTED_FIELDS, censor: '[REDACTED]' } },
      stream
    );
    return { testLogger, lines };
  }

  describe('given a logger configured with REDACTED_FIELDS', () => {
    it('when a log entry contains "password", then the value is replaced with [REDACTED]', () =>
      new Promise<void>((resolve) => {
        const { testLogger, lines } = makeTestLogger();
        testLogger.info({ password: 'super-secret' });
        setImmediate(() => {
          const entry = JSON.parse(lines[0]);
          expect(entry.password).toBe('[REDACTED]');
          resolve();
        });
      }));

    it('when a log entry contains "token", then the value is replaced with [REDACTED]', () =>
      new Promise<void>((resolve) => {
        const { testLogger, lines } = makeTestLogger();
        testLogger.info({ token: 'eyJhbGciOiJSUzI1NiJ9' });
        setImmediate(() => {
          const entry = JSON.parse(lines[0]);
          expect(entry.token).toBe('[REDACTED]');
          resolve();
        });
      }));

    it('when a log entry contains req.headers.authorization, then the value is replaced with [REDACTED]', () =>
      new Promise<void>((resolve) => {
        const { testLogger, lines } = makeTestLogger();
        testLogger.info({ req: { headers: { authorization: 'Bearer secret-token' } } });
        setImmediate(() => {
          const entry = JSON.parse(lines[0]);
          expect(entry.req.headers.authorization).toBe('[REDACTED]');
          resolve();
        });
      }));

    it('when a log entry contains non-sensitive fields, then they are logged unchanged', () =>
      new Promise<void>((resolve) => {
        const { testLogger, lines } = makeTestLogger();
        testLogger.info({ userId: 'u-123', action: 'login' });
        setImmediate(() => {
          const entry = JSON.parse(lines[0]);
          expect(entry.userId).toBe('u-123');
          expect(entry.action).toBe('login');
          resolve();
        });
      }));
  });
});

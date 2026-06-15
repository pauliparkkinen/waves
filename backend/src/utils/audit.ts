/**
 * src/utils/audit.ts
 *
 * Audit logger — records security-significant events as structured JSON.
 *
 * Audit entries are written to a separate pino child logger (child of the
 * application logger) with the "audit" field always set to true so that
 * log aggregators can route them independently.
 *
 * USAGE
 *   import { audit } from './audit.js';
 *   audit.access({ sub: user.sub, resource: '/records', action: 'read' });
 *   audit.authFailure({ reason: 'Invalid token', ip });
 */

import { logger } from './logger.js';

const auditLogger = logger.child({ audit: true });

export type AuditAccessEvent = {
  sub: string;
  resource: string;
  action: string;
  outcome?: 'allow' | 'deny';
  [key: string]: unknown;
};

export type AuditAuthEvent = {
  reason: string;
  ip?: string;
  sub?: string;
  [key: string]: unknown;
};

export const audit = {
  /**
   * Log a resource access event (read, write, delete, etc.).
   */
  access(event: AuditAccessEvent): void {
    auditLogger.info({ event: 'access', ...event });
  },

  /**
   * Log a successful authentication.
   */
  authSuccess(event: Omit<AuditAuthEvent, 'reason'>): void {
    auditLogger.info({ event: 'auth.success', ...event });
  },

  /**
   * Log a failed authentication or authorisation attempt.
   */
  authFailure(event: AuditAuthEvent): void {
    auditLogger.warn({ event: 'auth.failure', ...event });
  },

  /**
   * Log an authorisation denial (authenticated but insufficient permissions).
   */
  authDenied(event: AuditAuthEvent & { permissions: string[] }): void {
    auditLogger.warn({ event: 'auth.denied', ...event });
  },
};

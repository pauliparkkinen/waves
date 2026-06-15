import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuditLogger = {
  info: vi.fn(),
  warn: vi.fn(),
};

const mockLogger = {
  child: vi.fn().mockReturnValue(mockAuditLogger),
};

vi.mock('../../utils/logger.js', () => ({ logger: mockLogger }));

describe('audit', () => {
  beforeEach(() => {
    mockAuditLogger.info.mockClear();
    mockAuditLogger.warn.mockClear();
  });

  describe('given the audit module is initialised', () => {
    it('when imported, then a child logger with { audit: true } is created from the application logger', async () => {
      mockLogger.child.mockClear();
      vi.resetModules();
      await import('../../utils/audit.js');
      expect(mockLogger.child).toHaveBeenCalledWith({ audit: true });
    });
  });

  describe('given a resource access event', () => {
    it('when audit.access is called, then info is logged with event:"access" and all provided fields', async () => {
      const { audit } = await import('../../utils/audit.js');
      audit.access({ sub: 'user-1', resource: '/records', action: 'read', outcome: 'allow' });

      expect(mockAuditLogger.info).toHaveBeenCalledWith({
        event: 'access',
        sub: 'user-1',
        resource: '/records',
        action: 'read',
        outcome: 'allow',
      });
    });
  });

  describe('given a successful authentication', () => {
    it('when audit.authSuccess is called, then info is logged with event:"auth.success" and the subject', async () => {
      const { audit } = await import('../../utils/audit.js');
      audit.authSuccess({ sub: 'user-1' });

      expect(mockAuditLogger.info).toHaveBeenCalledWith({
        event: 'auth.success',
        sub: 'user-1',
      });
    });
  });

  describe('given a failed authentication attempt', () => {
    it('when audit.authFailure is called, then warn is logged with event:"auth.failure", reason, and ip', async () => {
      const { audit } = await import('../../utils/audit.js');
      audit.authFailure({ reason: 'Invalid token', ip: '1.2.3.4' });

      expect(mockAuditLogger.warn).toHaveBeenCalledWith({
        event: 'auth.failure',
        reason: 'Invalid token',
        ip: '1.2.3.4',
      });
    });

    it('when audit.authFailure is called without ip, then warn is logged with only reason', async () => {
      const { audit } = await import('../../utils/audit.js');
      audit.authFailure({ reason: 'Authentication required' });

      expect(mockAuditLogger.warn).toHaveBeenCalledWith({
        event: 'auth.failure',
        reason: 'Authentication required',
      });
    });
  });

  describe('given an authorisation denial', () => {
    it('when audit.authDenied is called, then warn is logged with event:"auth.denied", sub, and missing permissions', async () => {
      const { audit } = await import('../../utils/audit.js');
      audit.authDenied({
        reason: 'Insufficient permissions',
        sub: 'user-1',
        permissions: ['records:write'],
      });

      expect(mockAuditLogger.warn).toHaveBeenCalledWith({
        event: 'auth.denied',
        reason: 'Insufficient permissions',
        sub: 'user-1',
        permissions: ['records:write'],
      });
    });
  });
});

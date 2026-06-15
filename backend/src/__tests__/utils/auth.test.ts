import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AuthUser } from '../../types/auth.types.js';

const mockJwtVerify = vi.fn();
const mockCreateRemoteJWKSet = vi.fn().mockReturnValue({});

vi.mock('jose', () => ({
  createRemoteJWKSet: mockCreateRemoteJWKSet,
  jwtVerify: mockJwtVerify,
}));

const mockAudit = {
  authSuccess: vi.fn(),
  authFailure: vi.fn(),
  authDenied: vi.fn(),
  access: vi.fn(),
};

vi.mock('../../utils/audit.js', () => ({ audit: mockAudit }));

// ---------------------------------------------------------------------------
// requirePermissions
// ---------------------------------------------------------------------------

describe('requirePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeApp(user?: AuthUser, permissions: string[] = []) {
    const app = new Hono();
    if (user) {
      app.use('*', async (c, next) => {
        c.set('user', user);
        await next();
      });
    }
    return app;
  }

  describe('given no authenticated user on the context', () => {
    it('when a protected route is accessed, then 401 is returned', async () => {
      const { requirePermissions } = await import('../../utils/auth.js');
      const app = makeApp();
      app.get('/protected', requirePermissions(['resource:read']), (c) => c.json({ ok: true }));

      const res = await app.request('http://localhost/protected');

      expect(res.status).toBe(401);
    });

    it('when a protected route is accessed, then an auth.failure audit event is emitted', async () => {
      const { requirePermissions } = await import('../../utils/auth.js');
      const app = makeApp();
      app.get('/protected', requirePermissions(['resource:read']), (c) => c.json({ ok: true }));

      await app.request('http://localhost/protected');

      expect(mockAudit.authFailure).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'Authentication required' })
      );
    });
  });

  describe('given an authenticated user who is missing required permissions', () => {
    it('when a protected route is accessed, then 403 is returned', async () => {
      const { requirePermissions } = await import('../../utils/auth.js');
      const user: AuthUser = { sub: 'user-1', permissions: ['other:read'] };
      const app = makeApp(user);
      app.get('/protected', requirePermissions(['resource:read']), (c) => c.json({ ok: true }));

      const res = await app.request('http://localhost/protected');

      expect(res.status).toBe(403);
    });

    it('when a protected route is accessed, then an auth.denied audit event is emitted with the missing permissions', async () => {
      const { requirePermissions } = await import('../../utils/auth.js');
      const user: AuthUser = { sub: 'user-1', permissions: ['other:read'] };
      const app = makeApp(user);
      app.get('/protected', requirePermissions(['resource:read']), (c) => c.json({ ok: true }));

      await app.request('http://localhost/protected');

      expect(mockAudit.authDenied).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          permissions: ['resource:read'],
        })
      );
    });
  });

  describe('given an authenticated user with all required permissions', () => {
    it('when a protected route is accessed, then 200 is returned', async () => {
      const { requirePermissions } = await import('../../utils/auth.js');
      const user: AuthUser = { sub: 'user-1', permissions: ['resource:read', 'resource:write'] };
      const app = makeApp(user);
      app.get('/protected', requirePermissions(['resource:read']), (c) => c.json({ ok: true }));

      const res = await app.request('http://localhost/protected');

      expect(res.status).toBe(200);
    });

    it('when multiple permissions are required and the user has all of them, then 200 is returned', async () => {
      const { requirePermissions } = await import('../../utils/auth.js');
      const user: AuthUser = { sub: 'user-1', permissions: ['read', 'write', 'admin'] };
      const app = makeApp(user);
      app.get('/protected', requirePermissions(['read', 'write']), (c) => c.json({ ok: true }));

      const res = await app.request('http://localhost/protected');

      expect(res.status).toBe(200);
    });
  });
});

// ---------------------------------------------------------------------------
// createJwtMiddleware
// ---------------------------------------------------------------------------

describe('createJwtMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRemoteJWKSet.mockReturnValue({});
  });

  describe('given a request with no Authorization header', () => {
    it('when the JWT middleware processes the request, then no user is set and the request passes through', async () => {
      const { createJwtMiddleware } = await import('../../utils/auth.js');
      const app = new Hono();
      app.use('*', createJwtMiddleware('https://auth.example.com/keys'));
      app.get('/public', (c) => c.json({ user: c.get('user') ?? null }));

      const res = await app.request('http://localhost/public');

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ user: null });
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });
  });

  describe('given a request with a valid Bearer token containing a scope claim', () => {
    it('when the JWT middleware processes the request, then the user is set with permissions from the scope', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: { sub: 'user-42', email: 'user@example.com', scope: 'records:read records:write' },
      });

      const { createJwtMiddleware } = await import('../../utils/auth.js');
      const app = new Hono();
      app.use('*', createJwtMiddleware('https://auth.example.com/keys'));
      app.get('/me', (c) => c.json(c.get('user')));

      const res = await app.request('http://localhost/me', {
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.sub).toBe('user-42');
      expect(body.email).toBe('user@example.com');
      expect(body.permissions).toContain('records:read');
      expect(body.permissions).toContain('records:write');
    });

    it('when the JWT middleware processes the request, then an auth.success audit event is emitted', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: { sub: 'user-42', scope: 'records:read' },
      });

      const { createJwtMiddleware } = await import('../../utils/auth.js');
      const app = new Hono();
      app.use('*', createJwtMiddleware('https://auth.example.com/keys'));
      app.get('/me', (c) => c.json({ ok: true }));

      await app.request('http://localhost/me', {
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(mockAudit.authSuccess).toHaveBeenCalledWith({ sub: 'user-42' });
    });
  });

  describe('given a request with a valid Bearer token containing Zitadel role claims', () => {
    it('when the JWT middleware processes the request, then permissions include the Zitadel role names', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'user-42',
          'urn:zitadel:iam:org:project:123:roles': { 'records:read': {}, admin: {} },
        },
      });

      const { createJwtMiddleware } = await import('../../utils/auth.js');
      const app = new Hono();
      app.use('*', createJwtMiddleware('https://auth.example.com/keys'));
      app.get('/me', (c) => c.json(c.get('user')));

      const res = await app.request('http://localhost/me', {
        headers: { Authorization: 'Bearer valid-token' },
      });

      const body = await res.json();
      expect(body.permissions).toContain('records:read');
      expect(body.permissions).toContain('admin:manage');
    });
  });

  describe('given a request with an invalid or expired Bearer token', () => {
    it('when the JWT middleware processes the request, then 401 is returned', async () => {
      mockJwtVerify.mockRejectedValue(new Error('JWTExpired'));

      const { createJwtMiddleware } = await import('../../utils/auth.js');
      const app = new Hono();
      app.use('*', createJwtMiddleware('https://auth.example.com/keys'));
      app.get('/me', (c) => c.json({ ok: true }));

      const res = await app.request('http://localhost/me', {
        headers: { Authorization: 'Bearer expired-token' },
      });

      expect(res.status).toBe(401);
    });

    it('when the JWT middleware processes the request, then an auth.failure audit event is emitted', async () => {
      mockJwtVerify.mockRejectedValue(new Error('JWTExpired'));

      const { createJwtMiddleware } = await import('../../utils/auth.js');
      const app = new Hono();
      app.use('*', createJwtMiddleware('https://auth.example.com/keys'));
      app.get('/me', (c) => c.json({ ok: true }));

      await app.request('http://localhost/me', {
        headers: { Authorization: 'Bearer expired-token' },
      });

      expect(mockAudit.authFailure).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'Invalid or expired token' })
      );
    });
  });
});

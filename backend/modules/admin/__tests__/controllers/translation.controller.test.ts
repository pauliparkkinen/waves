import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { ITranslationService } from '../../services/translation.service.js';
import type { AuthUser } from '../../../../src/types/auth.types.js';

const mockAudit = {
  authSuccess: vi.fn(),
  authFailure: vi.fn(),
  authDenied: vi.fn(),
  access: vi.fn(),
};
vi.mock('../../../../src/utils/audit.js', () => ({ audit: mockAudit }));

// ---- Helpers ----

const adminUser: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
const nonAdminUser: AuthUser = { sub: 'u-2', permissions: ['read'] };

const existingTranslation = {
  translation_id: 'translation-1',
  collection_id: 'col-1',
  symbol: 'greeting',
  locale_code: 'en',
  value: 'Hello',
  version: 1,
  status: 'draft' as const,
};

function createService(
  overrides: Partial<ITranslationService> = {},
): ITranslationService {
  return {
    listTranslations: vi.fn().mockReturnValue([existingTranslation]),
    getTranslation: vi.fn().mockImplementation((id: string) =>
      id === 'translation-1' ? existingTranslation : undefined,
    ),
    createTranslation: vi.fn().mockReturnValue(existingTranslation),
    updateTranslation: vi.fn().mockImplementation((id: string) =>
      id === 'translation-1' ? existingTranslation : undefined,
    ),
    deleteTranslation: vi.fn().mockImplementation((id: string) => id === 'translation-1'),
    ...overrides,
  };
}

function appWithUser(user: AuthUser | null): Hono {
  const app = new Hono();
  if (user) {
    app.use('*', (c, next) => {
      c.set('user', user);
      return next();
    });
  }
  return app;
}

// ---- Tests ----

describe('createTranslationRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when called, then it returns the translation list', async () => {
        const { createTranslationRouter } = await import(
          '../../controllers/translation.controller.js'
        );
        const service = createService();
        const app = appWithUser(adminUser).route('/', createTranslationRouter(service));

        const res = await app.request('http://localhost/');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual([existingTranslation]);
      });

      it('when called with collection_id query, then it passes the filter', async () => {
        const { createTranslationRouter } = await import(
          '../../controllers/translation.controller.js'
        );
        const service = createService();
        const app = appWithUser(adminUser).route('/', createTranslationRouter(service));

        await app.request('http://localhost/?collection_id=col-1');

        expect(service.listTranslations).toHaveBeenCalledWith('col-1', adminUser);
      });
    });

    describe('given an unauthenticated user', () => {
      it('when called, then it returns 401', async () => {
        const { createTranslationRouter } = await import(
          '../../controllers/translation.controller.js'
        );
        const service = createService();
        const app = appWithUser(null).route('/', createTranslationRouter(service));

        const res = await app.request('http://localhost/');

        expect(res.status).toBe(401);
      });
    });

    describe('given an authenticated user without admin:manage', () => {
      it('when called, then it returns 403', async () => {
        const { createTranslationRouter } = await import(
          '../../controllers/translation.controller.js'
        );
        const service = createService();
        const app = appWithUser(nonAdminUser).route('/', createTranslationRouter(service));

        const res = await app.request('http://localhost/');

        expect(res.status).toBe(403);
      });
    });
  });

  describe('POST /', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when a valid body is sent, then it returns 201', async () => {
        const { createTranslationRouter } = await import(
          '../../controllers/translation.controller.js'
        );
        const service = createService({
          createTranslation: vi.fn().mockReturnValue(existingTranslation),
        });
        const app = appWithUser(adminUser).route('/', createTranslationRouter(service));

        const res = await app.request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify({
            collection_id: 'col-1',
            symbol: 'greeting',
            locale_code: 'en',
            value: 'Hello',
            status: 'draft',
          }),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body).toEqual(existingTranslation);
      });

      it('when service throws a validation error, then it returns 400', async () => {
        const { createTranslationRouter } = await import(
          '../../controllers/translation.controller.js'
        );
        const { TranslationValidationError } = await import(
          '../../validators/translation.validator.js'
        );
        const service = createService({
          createTranslation: vi.fn(() => {
            throw new TranslationValidationError([
              { field: 'symbol', message: 'symbol is required' },
            ]);
          }),
        });
        const app = appWithUser(adminUser).route('/', createTranslationRouter(service));

        const res = await app.request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify({ collection_id: '' }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(400);
      });

      it('when service throws a permission error, then it returns 403', async () => {
        const { createTranslationRouter } = await import(
          '../../controllers/translation.controller.js'
        );
        const service = createService({
          createTranslation: vi.fn(() => {
            throw new Error('Insufficient permissions: admin:manage required');
          }),
        });
        const app = appWithUser(adminUser).route('/', createTranslationRouter(service));

        const res = await app.request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify({
            collection_id: 'col-1',
            symbol: 'greeting',
            locale_code: 'en',
            value: 'Hello',
            status: 'draft',
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(403);
      });
    });

    describe('given an authenticated user without admin:manage', () => {
      it('when called, then it returns 403', async () => {
        const { createTranslationRouter } = await import(
          '../../controllers/translation.controller.js'
        );
        const service = createService();
        const app = appWithUser(nonAdminUser).route('/', createTranslationRouter(service));

        const res = await app.request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify({}),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(403);
      });
    });
  });

  describe('GET /:id', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when the translation exists, then it returns 200', async () => {
        const { createTranslationRouter } = await import(
          '../../controllers/translation.controller.js'
        );
        const service = createService();
        const app = appWithUser(adminUser).route('/', createTranslationRouter(service));

        const res = await app.request('http://localhost/translation-1');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(existingTranslation);
      });

      it('when the translation does not exist, then it returns 404', async () => {
        const { createTranslationRouter } = await import(
          '../../controllers/translation.controller.js'
        );
        const service = createService();
        const app = appWithUser(adminUser).route('/', createTranslationRouter(service));

        const res = await app.request('http://localhost/nonexistent');

        expect(res.status).toBe(404);
      });
    });

    describe('given an authenticated user without admin:manage', () => {
      it('when called, then it returns 403', async () => {
        const { createTranslationRouter } = await import(
          '../../controllers/translation.controller.js'
        );
        const service = createService();
        const app = appWithUser(nonAdminUser).route('/', createTranslationRouter(service));

        const res = await app.request('http://localhost/translation-1');

        expect(res.status).toBe(403);
      });
    });
  });

  describe('PUT /:id', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when the translation exists, then it returns 200', async () => {
        const { createTranslationRouter } = await import(
          '../../controllers/translation.controller.js'
        );
        const updated = { ...existingTranslation, symbol: 'updated' };
        const service = createService({
          updateTranslation: vi.fn().mockReturnValue(updated),
        });
        const app = appWithUser(adminUser).route('/', createTranslationRouter(service));

        const res = await app.request('http://localhost/translation-1', {
          method: 'PUT',
          body: JSON.stringify({ symbol: 'updated' }),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.symbol).toBe('updated');
      });

      it('when the translation does not exist, then it returns 404', async () => {
        const { createTranslationRouter } = await import(
          '../../controllers/translation.controller.js'
        );
        const service = createService({
          updateTranslation: vi.fn().mockReturnValue(undefined),
        });
        const app = appWithUser(adminUser).route('/', createTranslationRouter(service));

        const res = await app.request('http://localhost/nonexistent', {
          method: 'PUT',
          body: JSON.stringify({ symbol: 'updated' }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(404);
      });

      it('when service throws a validation error, then it returns 400', async () => {
        const { createTranslationRouter } = await import(
          '../../controllers/translation.controller.js'
        );
        const { TranslationValidationError } = await import(
          '../../validators/translation.validator.js'
        );
        const service = createService({
          updateTranslation: vi.fn(() => {
            throw new TranslationValidationError([
              { field: 'symbol', message: 'symbol must be a non-empty string' },
            ]);
          }),
        });
        const app = appWithUser(adminUser).route('/', createTranslationRouter(service));

        const res = await app.request('http://localhost/translation-1', {
          method: 'PUT',
          body: JSON.stringify({ symbol: '' }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(400);
      });

      it('when service throws a permission error, then it returns 403', async () => {
        const { createTranslationRouter } = await import(
          '../../controllers/translation.controller.js'
        );
        const service = createService({
          updateTranslation: vi.fn(() => {
            throw new Error('Insufficient permissions: admin:manage required');
          }),
        });
        const app = appWithUser(adminUser).route('/', createTranslationRouter(service));

        const res = await app.request('http://localhost/translation-1', {
          method: 'PUT',
          body: JSON.stringify({ symbol: 'updated' }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(403);
      });
    });

    describe('given an authenticated user without admin:manage', () => {
      it('when called, then it returns 403', async () => {
        const { createTranslationRouter } = await import(
          '../../controllers/translation.controller.js'
        );
        const service = createService();
        const app = appWithUser(nonAdminUser).route('/', createTranslationRouter(service));

        const res = await app.request('http://localhost/translation-1', {
          method: 'PUT',
          body: JSON.stringify({ symbol: 'updated' }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(403);
      });
    });
  });

  describe('DELETE /:id', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when the translation exists, then it returns 200 with success', async () => {
        const { createTranslationRouter } = await import(
          '../../controllers/translation.controller.js'
        );
        const service = createService({ deleteTranslation: vi.fn().mockReturnValue(true) });
        const app = appWithUser(adminUser).route('/', createTranslationRouter(service));

        const res = await app.request('http://localhost/translation-1', { method: 'DELETE' });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ success: true });
      });

      it('when the translation does not exist, then it returns 404', async () => {
        const { createTranslationRouter } = await import(
          '../../controllers/translation.controller.js'
        );
        const service = createService({ deleteTranslation: vi.fn().mockReturnValue(false) });
        const app = appWithUser(adminUser).route('/', createTranslationRouter(service));

        const res = await app.request('http://localhost/nonexistent', { method: 'DELETE' });

        expect(res.status).toBe(404);
      });
    });

    describe('given an authenticated user without admin:manage', () => {
      it('when called, then it returns 403', async () => {
        const { createTranslationRouter } = await import(
          '../../controllers/translation.controller.js'
        );
        const service = createService();
        const app = appWithUser(nonAdminUser).route('/', createTranslationRouter(service));

        const res = await app.request('http://localhost/translation-1', { method: 'DELETE' });

        expect(res.status).toBe(403);
      });
    });
  });
});

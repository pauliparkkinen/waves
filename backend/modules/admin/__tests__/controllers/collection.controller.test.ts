import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { ICollectionService } from '../../services/collection.service.js';
import type { AuthUser } from '../../../../src/types/auth.types.js';

const mockAudit = {
  authSuccess: vi.fn(),
  authFailure: vi.fn(),
  authDenied: vi.fn(),
  access: vi.fn(),
};
vi.mock('../../../../src/utils/audit.js', () => ({ audit: mockAudit }));

function makeService(overrides: Partial<ICollectionService> = {}): ICollectionService {
  return {
    getStatus: vi.fn().mockReturnValue({ status: 'ok', module: 'admin-collections' }),
    listCollections: vi.fn().mockReturnValue([]),
    getCollection: vi.fn().mockReturnValue(undefined),
    createCollection: vi
      .fn()
      .mockReturnValue({ collection_id: 'c-1', collection_permissions: [] }),
    updateCollection: vi.fn().mockReturnValue(undefined),
    deleteCollection: vi.fn().mockReturnValue(false),
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

describe('createCollectionRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    describe('given no authenticated user', () => {
      it('when the request is made, then it returns 401', async () => {
        const { createCollectionRouter } = await import(
          '../../controllers/collection.controller.js'
        );
        const app = appWithUser(null).route('/', createCollectionRouter(makeService()));

        const res = await app.request('http://localhost/');

        expect(res.status).toBe(401);
      });
    });

    describe('given an authenticated user without admin:manage', () => {
      it('when the request is made, then it returns 200 (org-level access)', async () => {
        const { createCollectionRouter } = await import(
          '../../controllers/collection.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: [] };
        const app = appWithUser(user).route('/', createCollectionRouter(makeService()));

        const res = await app.request('http://localhost/');

        expect(res.status).toBe(200);
      });
    });

    describe('given an authenticated user with admin:manage', () => {
      it('when the request is made, then it returns 200 with the collections', async () => {
        const { createCollectionRouter } = await import(
          '../../controllers/collection.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const collections = [{ collection_id: 'c-1', collection_permissions: [] }];
        const service = makeService({ listCollections: vi.fn().mockReturnValue(collections) });
        const app = appWithUser(user).route('/', createCollectionRouter(service));

        const res = await app.request('http://localhost/');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(collections);
      });
    });
  });

  describe('POST /', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when a valid body is sent, then it returns 201 with the created collection', async () => {
        const { createCollectionRouter } = await import(
          '../../controllers/collection.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const created = { collection_id: 'c-1', collection_permissions: [] };
        const service = makeService({ createCollection: vi.fn().mockReturnValue(created) });
        const app = appWithUser(user).route('/', createCollectionRouter(service));

        const res = await app.request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify({ collection_permissions: [] }),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body).toEqual(created);
      });
    });
  });

  describe('GET /:id', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when the collection exists, then it returns 200 with the collection', async () => {
        const { createCollectionRouter } = await import(
          '../../controllers/collection.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const collection = { collection_id: 'c-1', collection_permissions: [] };
        const service = makeService({ getCollection: vi.fn().mockReturnValue(collection) });
        const app = appWithUser(user).route('/', createCollectionRouter(service));

        const res = await app.request('http://localhost/c-1');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(collection);
      });

      it('when the collection does not exist, then it returns 404', async () => {
        const { createCollectionRouter } = await import(
          '../../controllers/collection.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ getCollection: vi.fn().mockReturnValue(undefined) });
        const app = appWithUser(user).route('/', createCollectionRouter(service));

        const res = await app.request('http://localhost/nonexistent');

        expect(res.status).toBe(404);
      });
    });
  });

  describe('PUT /:id', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when the collection exists, then it returns 200 with the updated collection', async () => {
        const { createCollectionRouter } = await import(
          '../../controllers/collection.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const updated = { collection_id: 'c-1', collection_permissions: [] };
        const service = makeService({ updateCollection: vi.fn().mockReturnValue(updated) });
        const app = appWithUser(user).route('/', createCollectionRouter(service));

        const res = await app.request('http://localhost/c-1', {
          method: 'PUT',
          body: JSON.stringify({ collection_permissions: [] }),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(updated);
      });

      it('when the collection does not exist, then it returns 404', async () => {
        const { createCollectionRouter } = await import(
          '../../controllers/collection.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ updateCollection: vi.fn().mockReturnValue(undefined) });
        const app = appWithUser(user).route('/', createCollectionRouter(service));

        const res = await app.request('http://localhost/nonexistent', {
          method: 'PUT',
          body: JSON.stringify({ collection_permissions: [] }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(404);
      });
    });
  });

  describe('DELETE /:id', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when the collection exists, then it returns 200 with success', async () => {
        const { createCollectionRouter } = await import(
          '../../controllers/collection.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ deleteCollection: vi.fn().mockReturnValue(true) });
        const app = appWithUser(user).route('/', createCollectionRouter(service));

        const res = await app.request('http://localhost/c-1', { method: 'DELETE' });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ success: true });
      });

      it('when the collection does not exist, then it returns 404', async () => {
        const { createCollectionRouter } = await import(
          '../../controllers/collection.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ deleteCollection: vi.fn().mockReturnValue(false) });
        const app = appWithUser(user).route('/', createCollectionRouter(service));

        const res = await app.request('http://localhost/nonexistent', { method: 'DELETE' });

        expect(res.status).toBe(404);
      });
    });
  });
});

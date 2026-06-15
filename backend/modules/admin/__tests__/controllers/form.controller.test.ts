import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { IFormService } from '../../services/form.service.js';
import type { AuthUser } from '../../../../src/types/auth.types.js';
import { FormValidationError } from '../../validators/form.validator.js';

const mockAudit = {
  authSuccess: vi.fn(),
  authFailure: vi.fn(),
  authDenied: vi.fn(),
  access: vi.fn(),
};
vi.mock('../../../../src/utils/audit.js', () => ({ audit: mockAudit }));

function makeService(overrides: Partial<IFormService> = {}): IFormService {
  return {
    listForms: vi.fn().mockReturnValue([]),
    getForm: vi.fn().mockReturnValue(undefined),
    createForm: vi.fn().mockReturnValue({
      form_id: 'form-1',
      collection_id: 'col-1',
      form_symbol: 'form-1',
      version: 1,
      status: 'draft',
      form_sections: [],
      formulas: [],
      form_organisations: [],
      translations: [],
    }),
    updateForm: vi.fn().mockReturnValue(undefined),
    deleteForm: vi.fn().mockReturnValue(false),
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

describe('createFormRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    describe('given no authenticated user', () => {
      it('when the request is made, then it returns 401', async () => {
        const { createFormRouter } = await import(
          '../../controllers/form.controller.js'
        );
        const app = appWithUser(null).route('/', createFormRouter(makeService()));

        const res = await app.request('http://localhost/');

        expect(res.status).toBe(401);
      });
    });

    describe('given an authenticated user without admin:manage', () => {
      it('when the request is made, then it returns 403', async () => {
        const { createFormRouter } = await import(
          '../../controllers/form.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: [] };
        const app = appWithUser(user).route('/', createFormRouter(makeService()));

        const res = await app.request('http://localhost/');

        expect(res.status).toBe(403);
      });
    });

    describe('given an authenticated user with admin:manage', () => {
      it('when the request is made, then it returns 200 with the forms', async () => {
        const { createFormRouter } = await import(
          '../../controllers/form.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const forms = [
          {
            form_id: 'form-1',
            collection_id: 'col-1',
            form_symbol: 'form-1',
            version: 1,
            status: 'draft',
            form_sections: [],
            formulas: [],
            form_organisations: [],
            translations: [],
          },
        ];
        const service = makeService({ listForms: vi.fn().mockReturnValue(forms) });
        const app = appWithUser(user).route('/', createFormRouter(service));

        const res = await app.request('http://localhost/');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(forms);
      });
    });
  });

  describe('POST /', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when a valid body is sent, then it returns 201 with the created form', async () => {
        const { createFormRouter } = await import(
          '../../controllers/form.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const created = {
          form_id: 'form-1',
          collection_id: 'col-1',
          form_symbol: 'form-1',
          version: 1,
          status: 'draft',
          form_sections: [],
          formulas: [],
          form_organisations: [],
          translations: [],
        };
        const service = makeService({ createForm: vi.fn().mockReturnValue(created) });
        const app = appWithUser(user).route('/', createFormRouter(service));

        const res = await app.request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify({
            collection_id: 'col-1',
            form_symbol: 'form-1',
            version: 1,
            status: 'draft',
            form_sections: [],
            formulas: [],
            form_organisations: [],
            translations: [],
          }),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body).toEqual(created);
      });

      it('when invalid body is sent (validation error), then it returns 400 with error details', async () => {
        const { createFormRouter } = await import(
          '../../controllers/form.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const errors = [
          { field: 'collection_id', message: 'collection_id is required and must be a non-empty string' },
          { field: 'form_symbol', message: 'form_symbol is required and must be a non-empty string' },
        ];
        const service = makeService({
          createForm: vi.fn().mockImplementation(() => {
            throw new FormValidationError(errors);
          }),
        });
        const app = appWithUser(user).route('/', createFormRouter(service));

        const res = await app.request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify({}),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body).toEqual({ error: 'Validation failed', errors });
      });
    });

    describe('given an authenticated user without admin:manage', () => {
      it('when the request is made, then it returns 403', async () => {
        const { createFormRouter } = await import(
          '../../controllers/form.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: [] };
        const app = appWithUser(user).route('/', createFormRouter(makeService()));

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
      it('when the form exists, then it returns 200 with the form', async () => {
        const { createFormRouter } = await import(
          '../../controllers/form.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const form = {
          form_id: 'form-1',
          collection_id: 'col-1',
          form_symbol: 'form-1',
          version: 1,
          status: 'draft',
          form_sections: [],
          formulas: [],
          form_organisations: [],
          translations: [],
        };
        const service = makeService({ getForm: vi.fn().mockReturnValue(form) });
        const app = appWithUser(user).route('/', createFormRouter(service));

        const res = await app.request('http://localhost/form-1');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(form);
      });

      it('when the form does not exist, then it returns 404', async () => {
        const { createFormRouter } = await import(
          '../../controllers/form.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ getForm: vi.fn().mockReturnValue(undefined) });
        const app = appWithUser(user).route('/', createFormRouter(service));

        const res = await app.request('http://localhost/nonexistent');

        expect(res.status).toBe(404);
      });
    });
  });

  describe('PUT /:id', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when the form exists and valid data is sent, then it returns 200 with the updated form', async () => {
        const { createFormRouter } = await import(
          '../../controllers/form.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const updated = {
          form_id: 'form-1',
          collection_id: 'col-1',
          form_symbol: 'form-1-updated',
          version: 1,
          status: 'draft',
          form_sections: [],
          formulas: [],
          form_organisations: [],
          translations: [],
        };
        const service = makeService({ updateForm: vi.fn().mockReturnValue(updated) });
        const app = appWithUser(user).route('/', createFormRouter(service));

        const res = await app.request('http://localhost/form-1', {
          method: 'PUT',
          body: JSON.stringify({ form_symbol: 'form-1-updated' }),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(updated);
      });

      it('when the form does not exist, then it returns 404', async () => {
        const { createFormRouter } = await import(
          '../../controllers/form.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ updateForm: vi.fn().mockReturnValue(undefined) });
        const app = appWithUser(user).route('/', createFormRouter(service));

        const res = await app.request('http://localhost/nonexistent', {
          method: 'PUT',
          body: JSON.stringify({ form_symbol: 'updated' }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(404);
      });

      it('when invalid data is sent (validation error), then it returns 400', async () => {
        const { createFormRouter } = await import(
          '../../controllers/form.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const errors = [
          { field: 'version', message: 'version must be >= 1' },
        ];
        const service = makeService({
          updateForm: vi.fn().mockImplementation(() => {
            throw new FormValidationError(errors);
          }),
        });
        const app = appWithUser(user).route('/', createFormRouter(service));

        const res = await app.request('http://localhost/form-1', {
          method: 'PUT',
          body: JSON.stringify({ version: 0 }),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body).toEqual({ error: 'Validation failed', errors });
      });
    });
  });

  describe('DELETE /:id', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when the form exists, then it returns 200 with success', async () => {
        const { createFormRouter } = await import(
          '../../controllers/form.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ deleteForm: vi.fn().mockReturnValue(true) });
        const app = appWithUser(user).route('/', createFormRouter(service));

        const res = await app.request('http://localhost/form-1', { method: 'DELETE' });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ success: true });
      });

      it('when the form does not exist, then it returns 404', async () => {
        const { createFormRouter } = await import(
          '../../controllers/form.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ deleteForm: vi.fn().mockReturnValue(false) });
        const app = appWithUser(user).route('/', createFormRouter(service));

        const res = await app.request('http://localhost/nonexistent', { method: 'DELETE' });

        expect(res.status).toBe(404);
      });
    });
  });
});

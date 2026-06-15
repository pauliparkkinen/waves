import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { IAdminService } from '../../services/admin.service.js';
import type { AuthUser } from '../../../../src/types/auth.types.js';

const mockAudit = {
  authSuccess: vi.fn(),
  authFailure: vi.fn(),
  authDenied: vi.fn(),
  access: vi.fn(),
};
vi.mock('../../../../src/utils/audit.js', () => ({ audit: mockAudit }));

function makeService(overrides: Partial<IAdminService> = {}): IAdminService {
  return {
    getStatus: vi.fn().mockReturnValue({ status: 'ok', module: 'admin' }),
    listForms: vi.fn().mockReturnValue([]),
    getForm: vi.fn().mockReturnValue(undefined),
    createForm: vi.fn().mockReturnValue({
      form_id: 'f-1',
      collection_id: 'col-1',
      form_symbol: 'f1',
      version: 1,
      form_sections: [],
      formulas: [],
      status: 'draft',
      form_organisations: [],
      translations: [],
    }),
    updateForm: vi.fn().mockReturnValue(undefined),
    deleteForm: vi.fn().mockReturnValue(false),
    listFormulas: vi.fn().mockReturnValue([]),
    getFormula: vi.fn().mockReturnValue(undefined),
    createFormula: vi.fn().mockReturnValue({
      formula_id: 'f-1',
      collection_id: 'col-1',
      symbol: 'f1',
      expression: {},
      output_type: 'number',
      formula_references: [],
    }),
    updateFormula: vi.fn().mockReturnValue(undefined),
    deleteFormula: vi.fn().mockReturnValue(false),
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

describe('createAdminRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /status', () => {
    describe('given no authenticated user', () => {
      it('when the request is made, then it returns 200 with the service status', async () => {
        const { createAdminRouter } = await import('../../controllers/admin.controller.js');
        const service = makeService();
        const app = appWithUser(null).route('/', createAdminRouter(service));

        const res = await app.request('http://localhost/status');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ status: 'ok', module: 'admin' });
        expect(service.getStatus).toHaveBeenCalled();
      });
    });
  });

  describe('GET /forms', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when called, then it returns the forms', async () => {
        const { createAdminRouter } = await import('../../controllers/admin.controller.js');
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const forms = [
          {
            form_id: 'f-1',
            collection_id: 'col-1',
            form_symbol: 'f1',
            version: 1,
            form_sections: [],
            formulas: [],
            status: 'draft',
            form_organisations: [],
            translations: [],
          },
        ];
        const service = makeService({ listForms: vi.fn().mockReturnValue(forms) });
        const app = appWithUser(user).route('/', createAdminRouter(service));

        const res = await app.request('http://localhost/forms');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(forms);
      });
    });
  });

  describe('POST /forms', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when a valid body is sent, then it returns 201', async () => {
        const { createAdminRouter } = await import('../../controllers/admin.controller.js');
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const created = {
          form_id: 'f-1',
          collection_id: 'col-1',
          form_symbol: 'f1',
          version: 1,
          form_sections: [],
          formulas: [],
          status: 'draft',
          form_organisations: [],
          translations: [],
        };
        const service = makeService({ createForm: vi.fn().mockReturnValue(created) });
        const app = appWithUser(user).route('/', createAdminRouter(service));

        const res = await app.request('http://localhost/forms', {
          method: 'POST',
          body: JSON.stringify({
            collection_id: 'col-1',
            form_symbol: 'f1',
            version: 1,
            form_sections: [],
            formulas: [],
            status: 'draft',
            form_organisations: [],
            translations: [],
          }),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body).toEqual(created);
      });
    });
  });

  describe('GET /forms/:id', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when the form exists, then it returns 200 with the form', async () => {
        const { createAdminRouter } = await import('../../controllers/admin.controller.js');
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const form = {
          form_id: 'f-1',
          collection_id: 'col-1',
          form_symbol: 'f1',
          version: 1,
          form_sections: [],
          formulas: [],
          status: 'draft',
          form_organisations: [],
          translations: [],
        };
        const service = makeService({ getForm: vi.fn().mockReturnValue(form) });
        const app = appWithUser(user).route('/', createAdminRouter(service));

        const res = await app.request('http://localhost/forms/f-1');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(form);
        expect(service.getForm).toHaveBeenCalledWith('f-1');
      });

      it('when the form does not exist, then it returns 404', async () => {
        const { createAdminRouter } = await import('../../controllers/admin.controller.js');
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ getForm: vi.fn().mockReturnValue(undefined) });
        const app = appWithUser(user).route('/', createAdminRouter(service));

        const res = await app.request('http://localhost/forms/nonexistent');

        expect(res.status).toBe(404);
      });
    });
  });

  describe('PUT /forms/:id', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when the form exists, then it returns 200 with the updated form', async () => {
        const { createAdminRouter } = await import('../../controllers/admin.controller.js');
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const updated = {
          form_id: 'f-1',
          collection_id: 'col-1',
          form_symbol: 'f1-updated',
          version: 1,
          form_sections: [],
          formulas: [],
          status: 'draft',
          form_organisations: [],
          translations: [],
        };
        const service = makeService({ updateForm: vi.fn().mockReturnValue(updated) });
        const app = appWithUser(user).route('/', createAdminRouter(service));

        const res = await app.request('http://localhost/forms/f-1', {
          method: 'PUT',
          body: JSON.stringify({ form_symbol: 'f1-updated' }),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(updated);
      });

      it('when the form does not exist, then it returns 404', async () => {
        const { createAdminRouter } = await import('../../controllers/admin.controller.js');
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ updateForm: vi.fn().mockReturnValue(undefined) });
        const app = appWithUser(user).route('/', createAdminRouter(service));

        const res = await app.request('http://localhost/forms/nonexistent', {
          method: 'PUT',
          body: JSON.stringify({ form_symbol: 'f1-updated' }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(404);
      });
    });
  });

  describe('DELETE /forms/:id', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when the form exists, then it returns 200 with success', async () => {
        const { createAdminRouter } = await import('../../controllers/admin.controller.js');
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ deleteForm: vi.fn().mockReturnValue(true) });
        const app = appWithUser(user).route('/', createAdminRouter(service));

        const res = await app.request('http://localhost/forms/f-1', { method: 'DELETE' });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ success: true });
      });

      it('when the form does not exist, then it returns 404', async () => {
        const { createAdminRouter } = await import('../../controllers/admin.controller.js');
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ deleteForm: vi.fn().mockReturnValue(false) });
        const app = appWithUser(user).route('/', createAdminRouter(service));

        const res = await app.request('http://localhost/forms/nonexistent', {
          method: 'DELETE',
        });

        expect(res.status).toBe(404);
      });
    });
  });

  describe('GET /formulas', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when called, then it returns the formulas', async () => {
        const { createAdminRouter } = await import('../../controllers/admin.controller.js');
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const formulas = [
          {
            formula_id: 'f-1',
            collection_id: 'col-1',
            symbol: 'f1',
            expression: {},
            output_type: 'number',
            formula_references: [],
          },
        ];
        const service = makeService({ listFormulas: vi.fn().mockReturnValue(formulas) });
        const app = appWithUser(user).route('/', createAdminRouter(service));

        const res = await app.request('http://localhost/formulas');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(formulas);
      });
    });
  });

  describe('POST /formulas', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when a valid body is sent, then it returns 201', async () => {
        const { createAdminRouter } = await import('../../controllers/admin.controller.js');
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const created = {
          formula_id: 'f-1',
          collection_id: 'col-1',
          symbol: 'f1',
          expression: {},
          output_type: 'number',
          formula_references: [],
        };
        const service = makeService({ createFormula: vi.fn().mockReturnValue(created) });
        const app = appWithUser(user).route('/', createAdminRouter(service));

        const res = await app.request('http://localhost/formulas', {
          method: 'POST',
          body: JSON.stringify({
            collection_id: 'col-1',
            symbol: 'f1',
            expression: {},
            output_type: 'number',
            formula_references: [],
          }),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body).toEqual(created);
      });
    });
  });

  describe('GET /formulas/:id', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when the formula exists, then it returns 200 with the formula', async () => {
        const { createAdminRouter } = await import('../../controllers/admin.controller.js');
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const formula = {
          formula_id: 'f-1',
          collection_id: 'col-1',
          symbol: 'f1',
          expression: {},
          output_type: 'number',
          formula_references: [],
        };
        const service = makeService({ getFormula: vi.fn().mockReturnValue(formula) });
        const app = appWithUser(user).route('/', createAdminRouter(service));

        const res = await app.request('http://localhost/formulas/f-1');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(formula);
        expect(service.getFormula).toHaveBeenCalledWith('f-1');
      });

      it('when the formula does not exist, then it returns 404', async () => {
        const { createAdminRouter } = await import('../../controllers/admin.controller.js');
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ getFormula: vi.fn().mockReturnValue(undefined) });
        const app = appWithUser(user).route('/', createAdminRouter(service));

        const res = await app.request('http://localhost/formulas/nonexistent');

        expect(res.status).toBe(404);
      });
    });
  });

  describe('PUT /formulas/:id', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when the formula exists, then it returns 200 with the updated formula', async () => {
        const { createAdminRouter } = await import('../../controllers/admin.controller.js');
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const updated = {
          formula_id: 'f-1',
          collection_id: 'col-1',
          symbol: 'f1-updated',
          expression: {},
          output_type: 'number',
          formula_references: [],
        };
        const service = makeService({ updateFormula: vi.fn().mockReturnValue(updated) });
        const app = appWithUser(user).route('/', createAdminRouter(service));

        const res = await app.request('http://localhost/formulas/f-1', {
          method: 'PUT',
          body: JSON.stringify({ symbol: 'f1-updated' }),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(updated);
      });

      it('when the formula does not exist, then it returns 404', async () => {
        const { createAdminRouter } = await import('../../controllers/admin.controller.js');
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ updateFormula: vi.fn().mockReturnValue(undefined) });
        const app = appWithUser(user).route('/', createAdminRouter(service));

        const res = await app.request('http://localhost/formulas/nonexistent', {
          method: 'PUT',
          body: JSON.stringify({ symbol: 'f1-updated' }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(404);
      });
    });
  });

  describe('DELETE /formulas/:id', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when the formula exists, then it returns 200 with success', async () => {
        const { createAdminRouter } = await import('../../controllers/admin.controller.js');
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ deleteFormula: vi.fn().mockReturnValue(true) });
        const app = appWithUser(user).route('/', createAdminRouter(service));

        const res = await app.request('http://localhost/formulas/f-1', { method: 'DELETE' });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ success: true });
      });

      it('when the formula does not exist, then it returns 404', async () => {
        const { createAdminRouter } = await import('../../controllers/admin.controller.js');
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ deleteFormula: vi.fn().mockReturnValue(false) });
        const app = appWithUser(user).route('/', createAdminRouter(service));

        const res = await app.request('http://localhost/formulas/nonexistent', {
          method: 'DELETE',
        });

        expect(res.status).toBe(404);
      });
    });
  });
});

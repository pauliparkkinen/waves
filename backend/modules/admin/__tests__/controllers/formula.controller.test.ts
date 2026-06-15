import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { IFormulaService } from '../../services/formula.service.js';
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

const validNumberExpr = {
  type: 'binary_expression',
  operator: '+',
  left: { type: 'literal', value: 5 },
  right: { type: 'literal', value: 3 },
};

const existingFormula = {
  formula_id: 'formula-1',
  collection_id: 'col-1',
  symbol: 'test-formula',
  expression: validNumberExpr,
  output_type: 'number',
  formula_references: [],
};

function createService(overrides: Partial<IFormulaService> = {}): IFormulaService {
  return {
    listFormulas: vi.fn().mockReturnValue([existingFormula]),
    getFormula: vi.fn().mockImplementation((id: string) =>
      id === 'formula-1' ? existingFormula : undefined,
    ),
    createFormula: vi.fn().mockReturnValue(existingFormula),
    updateFormula: vi.fn().mockImplementation((id: string) =>
      id === 'formula-1' ? existingFormula : undefined,
    ),
    deleteFormula: vi.fn().mockImplementation((id: string) => id === 'formula-1'),
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

describe('createFormulaRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when called, then it returns the formula list', async () => {
        const { createFormulaRouter } = await import('../../controllers/formula.controller.js');
        const service = createService();
        const app = appWithUser(adminUser).route('/', createFormulaRouter(service));

        const res = await app.request('http://localhost/');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual([existingFormula]);
      });

      it('when called with collection_id query, then it passes the filter', async () => {
        const { createFormulaRouter } = await import('../../controllers/formula.controller.js');
        const service = createService();
        const app = appWithUser(adminUser).route('/', createFormulaRouter(service));

        await app.request('http://localhost/?collection_id=col-1');

        expect(service.listFormulas).toHaveBeenCalledWith('col-1');
      });
    });

    describe('given an unauthenticated user', () => {
      it('when called, then it returns 401', async () => {
        const { createFormulaRouter } = await import('../../controllers/formula.controller.js');
        const service = createService();
        const app = appWithUser(null).route('/', createFormulaRouter(service));

        const res = await app.request('http://localhost/');

        expect(res.status).toBe(401);
      });
    });

    describe('given an authenticated user without admin:manage', () => {
      it('when called, then it returns 403', async () => {
        const { createFormulaRouter } = await import('../../controllers/formula.controller.js');
        const service = createService();
        const app = appWithUser(nonAdminUser).route('/', createFormulaRouter(service));

        const res = await app.request('http://localhost/');

        expect(res.status).toBe(403);
      });
    });
  });

  describe('POST /', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when a valid body is sent, then it returns 201', async () => {
        const { createFormulaRouter } = await import('../../controllers/formula.controller.js');
        const service = createService({
          createFormula: vi.fn().mockReturnValue(existingFormula),
        });
        const app = appWithUser(adminUser).route('/', createFormulaRouter(service));

        const res = await app.request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify({
            collection_id: 'col-1',
            symbol: 'f1',
            expression: validNumberExpr,
            output_type: 'number',
            formula_references: [],
          }),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body).toEqual(existingFormula);
      });

      it('when service throws a validation error, then it returns 400', async () => {
        const { createFormulaRouter } = await import('../../controllers/formula.controller.js');
        const service = createService({
          createFormula: vi.fn(() => {
            throw new Error('output_type must be one of: number, boolean');
          }),
        });
        const app = appWithUser(adminUser).route('/', createFormulaRouter(service));

        const res = await app.request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify({ output_type: 'invalid' }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(400);
      });

      it('when service throws a permission error, then it returns 403', async () => {
        const { createFormulaRouter } = await import('../../controllers/formula.controller.js');
        const service = createService({
          createFormula: vi.fn(() => {
            throw new Error('Insufficient permissions: admin:manage required');
          }),
        });
        const app = appWithUser(adminUser).route('/', createFormulaRouter(service));

        const res = await app.request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify({
            collection_id: 'col-1',
            symbol: 'f1',
            expression: validNumberExpr,
            output_type: 'number',
            formula_references: [],
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(403);
      });
    });

    describe('given an authenticated user without admin:manage', () => {
      it('when called, then it returns 403', async () => {
        const { createFormulaRouter } = await import('../../controllers/formula.controller.js');
        const service = createService();
        const app = appWithUser(nonAdminUser).route('/', createFormulaRouter(service));

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
      it('when the formula exists, then it returns 200', async () => {
        const { createFormulaRouter } = await import('../../controllers/formula.controller.js');
        const service = createService();
        const app = appWithUser(adminUser).route('/', createFormulaRouter(service));

        const res = await app.request('http://localhost/formula-1');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(existingFormula);
      });

      it('when the formula does not exist, then it returns 404', async () => {
        const { createFormulaRouter } = await import('../../controllers/formula.controller.js');
        const service = createService();
        const app = appWithUser(adminUser).route('/', createFormulaRouter(service));

        const res = await app.request('http://localhost/nonexistent');

        expect(res.status).toBe(404);
      });
    });

    describe('given an authenticated user without admin:manage', () => {
      it('when called, then it returns 403', async () => {
        const { createFormulaRouter } = await import('../../controllers/formula.controller.js');
        const service = createService();
        const app = appWithUser(nonAdminUser).route('/', createFormulaRouter(service));

        const res = await app.request('http://localhost/formula-1');

        expect(res.status).toBe(403);
      });
    });
  });

  describe('PUT /:id', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when the formula exists, then it returns 200', async () => {
        const { createFormulaRouter } = await import('../../controllers/formula.controller.js');
        const updated = { ...existingFormula, symbol: 'updated' };
        const service = createService({
          updateFormula: vi.fn().mockReturnValue(updated),
        });
        const app = appWithUser(adminUser).route('/', createFormulaRouter(service));

        const res = await app.request('http://localhost/formula-1', {
          method: 'PUT',
          body: JSON.stringify({ symbol: 'updated' }),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.symbol).toBe('updated');
      });

      it('when the formula does not exist, then it returns 404', async () => {
        const { createFormulaRouter } = await import('../../controllers/formula.controller.js');
        const service = createService({
          updateFormula: vi.fn().mockReturnValue(undefined),
        });
        const app = appWithUser(adminUser).route('/', createFormulaRouter(service));

        const res = await app.request('http://localhost/nonexistent', {
          method: 'PUT',
          body: JSON.stringify({ symbol: 'updated' }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(404);
      });

      it('when service throws a validation error, then it returns 400', async () => {
        const { createFormulaRouter } = await import('../../controllers/formula.controller.js');
        const service = createService({
          updateFormula: vi.fn(() => {
            throw new Error('symbol must be a non-empty string');
          }),
        });
        const app = appWithUser(adminUser).route('/', createFormulaRouter(service));

        const res = await app.request('http://localhost/formula-1', {
          method: 'PUT',
          body: JSON.stringify({ symbol: '' }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(400);
      });

      it('when service throws a permission error, then it returns 403', async () => {
        const { createFormulaRouter } = await import('../../controllers/formula.controller.js');
        const service = createService({
          updateFormula: vi.fn(() => {
            throw new Error('Insufficient permissions: admin:manage required');
          }),
        });
        const app = appWithUser(adminUser).route('/', createFormulaRouter(service));

        const res = await app.request('http://localhost/formula-1', {
          method: 'PUT',
          body: JSON.stringify({ symbol: 'updated' }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(403);
      });
    });

    describe('given an authenticated user without admin:manage', () => {
      it('when called, then it returns 403', async () => {
        const { createFormulaRouter } = await import('../../controllers/formula.controller.js');
        const service = createService();
        const app = appWithUser(nonAdminUser).route('/', createFormulaRouter(service));

        const res = await app.request('http://localhost/formula-1', {
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
      it('when the formula exists, then it returns 200 with success', async () => {
        const { createFormulaRouter } = await import('../../controllers/formula.controller.js');
        const service = createService({ deleteFormula: vi.fn().mockReturnValue(true) });
        const app = appWithUser(adminUser).route('/', createFormulaRouter(service));

        const res = await app.request('http://localhost/formula-1', { method: 'DELETE' });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ success: true });
      });

      it('when the formula does not exist, then it returns 404', async () => {
        const { createFormulaRouter } = await import('../../controllers/formula.controller.js');
        const service = createService({ deleteFormula: vi.fn().mockReturnValue(false) });
        const app = appWithUser(adminUser).route('/', createFormulaRouter(service));

        const res = await app.request('http://localhost/nonexistent', { method: 'DELETE' });

        expect(res.status).toBe(404);
      });
    });

    describe('given an authenticated user without admin:manage', () => {
      it('when called, then it returns 403', async () => {
        const { createFormulaRouter } = await import('../../controllers/formula.controller.js');
        const service = createService();
        const app = appWithUser(nonAdminUser).route('/', createFormulaRouter(service));

        const res = await app.request('http://localhost/formula-1', { method: 'DELETE' });

        expect(res.status).toBe(403);
      });
    });
  });
});

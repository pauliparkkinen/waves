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

});

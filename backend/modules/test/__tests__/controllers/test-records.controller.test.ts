import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { ITestService } from '../../services/test.service.js';
import type { AuthUser } from '../../../../src/types/auth.types.js';

// Mock audit to prevent noisy pino output when auth middleware fires
const mockAudit = {
  authSuccess: vi.fn(),
  authFailure: vi.fn(),
  authDenied: vi.fn(),
  access: vi.fn(),
};
vi.mock('../../../../src/utils/audit.js', () => ({ audit: mockAudit }));

function makeService(overrides: Partial<ITestService> = {}): ITestService {
  return {
    getStatus: vi.fn().mockReturnValue({ message: 'Test module is working' }),
    greet: vi.fn().mockReturnValue({ message: 'Hello, Test!' }),
    listRecords: vi.fn().mockReturnValue([
      { id: '1', name: 'World' },
      { id: '2', name: 'Waves' },
    ]),
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

describe('createTestRecordsRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    describe('given no authenticated user', () => {
      it('when the request is made, then it returns 401', async () => {
        const { createTestRecordsRouter } =
          await import('../../controllers/test-records.controller.js');
        const app = appWithUser(null).route('/', createTestRecordsRouter(makeService()));

        const res = await app.request('http://localhost/');

        expect(res.status).toBe(401);
        expect(mockAudit.authFailure).toHaveBeenCalled();
      });
    });

    describe('given an authenticated user without the required permission', () => {
      it('when the request is made, then it returns 403', async () => {
        const { createTestRecordsRouter } =
          await import('../../controllers/test-records.controller.js');
        const user: AuthUser = { sub: 'u-1', permissions: [] };
        const app = appWithUser(user).route('/', createTestRecordsRouter(makeService()));

        const res = await app.request('http://localhost/');

        expect(res.status).toBe(403);
        expect(mockAudit.authDenied).toHaveBeenCalledWith(expect.objectContaining({ sub: 'u-1' }));
      });
    });

    describe('given an authenticated user with the records:read permission', () => {
      it('when the request is made, then it returns 200 with the records', async () => {
        const { createTestRecordsRouter } =
          await import('../../controllers/test-records.controller.js');
        const user: AuthUser = { sub: 'u-1', permissions: ['records:read'] };
        const records = [
          { id: '1', name: 'World' },
          { id: '2', name: 'Waves' },
        ];
        const service = makeService({ listRecords: vi.fn().mockReturnValue(records) });
        const app = appWithUser(user).route('/', createTestRecordsRouter(service));

        const res = await app.request('http://localhost/');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(records);
        expect(service.listRecords).toHaveBeenCalled();
      });
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { ISandboxService } from '../../services/sandbox.service.js';
import type { AuthUser } from '../../../../src/types/auth.types.js';

const mockAudit = {
  authSuccess: vi.fn(),
  authFailure: vi.fn(),
  authDenied: vi.fn(),
  access: vi.fn(),
};
vi.mock('../../../../src/utils/audit.js', () => ({ audit: mockAudit }));

function makeService(overrides: Partial<ISandboxService> = {}): ISandboxService {
  return {
    testForm: vi.fn().mockReturnValue({
      form_id: 'form-1',
      form_symbol: 'test-form',
      sections: [],
      formulas: [],
      received_answers: {},
    }),
    testSection: vi.fn().mockReturnValue({
      form_id: '__test__',
      form_symbol: '__test__',
      sections: [],
      formulas: [],
      received_answers: {},
    }),
    testQuestion: vi.fn().mockReturnValue({
      form_id: '__test__',
      form_symbol: '__test__',
      sections: [],
      formulas: [],
      received_answers: {},
    }),
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

describe('createSandboxRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /forms/:id/test', () => {
    describe('given no authenticated user', () => {
      it('when the request is made, then it returns 401', async () => {
        const { createSandboxRouter } = await import(
          '../../controllers/sandbox.controller.js'
        );
        const app = appWithUser(null).route('/', createSandboxRouter(makeService()));

        const res = await app.request('http://localhost/forms/form-1/test', {
          method: 'POST',
          body: JSON.stringify({ answers: {} }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(401);
      });
    });

    describe('given an authenticated user without admin:manage', () => {
      it('when the request is made, then it returns 403', async () => {
        const { createSandboxRouter } = await import(
          '../../controllers/sandbox.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: [] };
        const app = appWithUser(user).route('/', createSandboxRouter(makeService()));

        const res = await app.request('http://localhost/forms/form-1/test', {
          method: 'POST',
          body: JSON.stringify({ answers: {} }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(403);
      });
    });

    describe('given an authenticated user with admin:manage', () => {
      it('when valid input is sent, then it returns 200 with the sandbox result', async () => {
        const { createSandboxRouter } = await import(
          '../../controllers/sandbox.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const expectedResult = {
          form_id: 'form-1',
          form_symbol: 'test-form',
          sections: [
            {
              section_symbol: 'sec-1',
              visible: true,
              questions: [
                { question_symbol: 'q1', visible: true },
              ],
            },
          ],
          formulas: [
            { formula_symbol: 'total', value: 42 },
          ],
          received_answers: {},
        };
        const service = makeService({
          testForm: vi.fn().mockReturnValue(expectedResult),
        });
        const app = appWithUser(user).route('/', createSandboxRouter(service));

        const res = await app.request('http://localhost/forms/form-1/test', {
          method: 'POST',
          body: JSON.stringify({ answers: { q1: 10 } }),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(expectedResult);
      });

      it('when answers is null, then it returns 400', async () => {
        const { createSandboxRouter } = await import(
          '../../controllers/sandbox.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const app = appWithUser(user).route('/', createSandboxRouter(makeService()));

        const res = await app.request('http://localhost/forms/form-1/test', {
          method: 'POST',
          body: JSON.stringify({ answers: null }),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.error).toContain('answers');
      });

      it('when the body is missing answers field, then it returns 400', async () => {
        const { createSandboxRouter } = await import(
          '../../controllers/sandbox.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const app = appWithUser(user).route('/', createSandboxRouter(makeService()));

        const res = await app.request('http://localhost/forms/form-1/test', {
          method: 'POST',
          body: JSON.stringify({}),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.error).toContain('answers');
      });

      it('when the body is not valid JSON, then it returns 500', async () => {
        const { createSandboxRouter } = await import(
          '../../controllers/sandbox.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const app = appWithUser(user).route('/', createSandboxRouter(makeService()));

        const res = await app.request('http://localhost/forms/form-1/test', {
          method: 'POST',
          body: 'not-json',
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(500);
      });

      it('when a formula referenced by the form is not found, then it returns 404', async () => {
        const { createSandboxRouter } = await import(
          '../../controllers/sandbox.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({
          testForm: vi.fn().mockImplementation(() => {
            throw new Error('Formula not found: missing-formula');
          }),
        });
        const app = appWithUser(user).route('/', createSandboxRouter(service));

        const res = await app.request('http://localhost/forms/form-1/test', {
          method: 'POST',
          body: JSON.stringify({ answers: {} }),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.error).toContain('Formula not found');
      });

      it('when the form is not found, then it returns 404', async () => {
        const { createSandboxRouter } = await import(
          '../../controllers/sandbox.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({
          testForm: vi.fn().mockImplementation(() => {
            throw new Error('Form not found: nonexistent');
          }),
        });
        const app = appWithUser(user).route('/', createSandboxRouter(service));

        const res = await app.request('http://localhost/forms/nonexistent/test', {
          method: 'POST',
          body: JSON.stringify({ answers: {} }),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.error).toContain('Form not found');
      });
    });
  });

  describe('POST /sections/:id/test', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when valid input is sent, then it returns 200', async () => {
        const { createSandboxRouter } = await import(
          '../../controllers/sandbox.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const expectedResult = {
          form_id: '__test__',
          form_symbol: '__test__',
          sections: [
            {
              section_symbol: 'sec-1',
              visible: true,
              questions: [{ question_symbol: 'q1', visible: true }],
            },
          ],
          formulas: [],
          received_answers: {},
        };
        const service = makeService({
          testSection: vi.fn().mockReturnValue(expectedResult),
        });
        const app = appWithUser(user).route('/', createSandboxRouter(service));

        const res = await app.request('http://localhost/sections/section-1/test', {
          method: 'POST',
          body: JSON.stringify({ answers: {} }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual(expectedResult);
      });

      it('when the section is not found, then it returns 404', async () => {
        const { createSandboxRouter } = await import(
          '../../controllers/sandbox.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({
          testSection: vi.fn().mockImplementation(() => {
            throw new Error('Section not found: missing');
          }),
        });
        const app = appWithUser(user).route('/', createSandboxRouter(service));

        const res = await app.request('http://localhost/sections/missing/test', {
          method: 'POST',
          body: JSON.stringify({ answers: {} }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(404);
      });

      it('when answers field is missing, then it returns 400', async () => {
        const { createSandboxRouter } = await import(
          '../../controllers/sandbox.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const app = appWithUser(user).route('/', createSandboxRouter(makeService()));

        const res = await app.request('http://localhost/sections/section-1/test', {
          method: 'POST',
          body: JSON.stringify({}),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(400);
      });
    });
  });

  describe('POST /questions/:id/test', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when valid input is sent, then it returns 200', async () => {
        const { createSandboxRouter } = await import(
          '../../controllers/sandbox.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const expectedResult = {
          form_id: '__test__',
          form_symbol: '__test__',
          sections: [
            {
              section_symbol: '__test__',
              visible: true,
              questions: [{ question_symbol: 'q1', visible: true }],
            },
          ],
          formulas: [],
          received_answers: {},
        };
        const service = makeService({
          testQuestion: vi.fn().mockReturnValue(expectedResult),
        });
        const app = appWithUser(user).route('/', createSandboxRouter(service));

        const res = await app.request('http://localhost/questions/question-1/test', {
          method: 'POST',
          body: JSON.stringify({ answers: {} }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual(expectedResult);
      });

      it('when the question is not found, then it returns 404', async () => {
        const { createSandboxRouter } = await import(
          '../../controllers/sandbox.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({
          testQuestion: vi.fn().mockImplementation(() => {
            throw new Error('Question not found: missing');
          }),
        });
        const app = appWithUser(user).route('/', createSandboxRouter(service));

        const res = await app.request('http://localhost/questions/missing/test', {
          method: 'POST',
          body: JSON.stringify({ answers: {} }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(404);
      });

      it('when answers field is missing, then it returns 400', async () => {
        const { createSandboxRouter } = await import(
          '../../controllers/sandbox.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const app = appWithUser(user).route('/', createSandboxRouter(makeService()));

        const res = await app.request('http://localhost/questions/question-1/test', {
          method: 'POST',
          body: JSON.stringify({}),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(400);
      });
    });
  });
});

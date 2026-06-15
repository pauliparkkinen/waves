import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { IQuestionService } from '../../services/question.service.js';
import type { AuthUser } from '../../../../src/types/auth.types.js';
import { QuestionValidationError } from '../../validators/question.validator.js';

const mockAudit = {
  authSuccess: vi.fn(),
  authFailure: vi.fn(),
  authDenied: vi.fn(),
  access: vi.fn(),
};
vi.mock('../../../../src/utils/audit.js', () => ({ audit: mockAudit }));

function makeService(overrides: Partial<IQuestionService> = {}): IQuestionService {
  return {
    listQuestions: vi.fn().mockReturnValue([]),
    getQuestion: vi.fn().mockReturnValue(undefined),
    createQuestion: vi.fn().mockReturnValue({
      question_id: 'q-1',
      collection_id: 'col-1',
      question_symbol: 'q1',
      type: 'free-text',
      version: 1,
      parameters: {},
      created_at: '',
      updated_at: '',
      translations: [],
    }),
    updateQuestion: vi.fn().mockReturnValue(undefined),
    deleteQuestion: vi.fn().mockReturnValue(false),
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

describe('createQuestionRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    describe('given no authenticated user', () => {
      it('when the request is made, then it returns 401', async () => {
        const { createQuestionRouter } = await import(
          '../../controllers/question.controller.js'
        );
        const app = appWithUser(null).route('/', createQuestionRouter(makeService()));

        const res = await app.request('http://localhost/');

        expect(res.status).toBe(401);
      });
    });

    describe('given an authenticated user without admin:manage', () => {
      it('when the request is made, then it returns 403', async () => {
        const { createQuestionRouter } = await import(
          '../../controllers/question.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: [] };
        const app = appWithUser(user).route('/', createQuestionRouter(makeService()));

        const res = await app.request('http://localhost/');

        expect(res.status).toBe(403);
      });
    });

    describe('given an authenticated user with admin:manage', () => {
      it('when the request is made, then it returns 200 with the questions', async () => {
        const { createQuestionRouter } = await import(
          '../../controllers/question.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const questions = [
          {
            question_id: 'q-1',
            collection_id: 'col-1',
            question_symbol: 'q1',
            type: 'free-text',
            version: 1,
            parameters: {},
            created_at: '',
            updated_at: '',
            translations: [],
          },
        ];
        const service = makeService({ listQuestions: vi.fn().mockReturnValue(questions) });
        const app = appWithUser(user).route('/', createQuestionRouter(service));

        const res = await app.request('http://localhost/');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(questions);
      });

      it('when a collectionId query param is provided, then it passes it to the service', async () => {
        const { createQuestionRouter } = await import(
          '../../controllers/question.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService();
        const app = appWithUser(user).route('/', createQuestionRouter(service));

        const res = await app.request('http://localhost/?collectionId=col-1');

        expect(res.status).toBe(200);
        expect(service.listQuestions).toHaveBeenCalledWith('col-1', user);
      });
    });
  });

  describe('POST /', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when a valid body is sent, then it returns 201 with the created question', async () => {
        const { createQuestionRouter } = await import(
          '../../controllers/question.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const created = {
          question_id: 'q-1',
          collection_id: 'col-1',
          question_symbol: 'q1',
          type: 'free-text',
          version: 1,
          parameters: {},
          created_at: '',
          updated_at: '',
          translations: [],
        };
        const service = makeService({ createQuestion: vi.fn().mockReturnValue(created) });
        const app = appWithUser(user).route('/', createQuestionRouter(service));

        const res = await app.request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify({
            collection_id: 'col-1',
            question_symbol: 'q1',
            type: 'free-text',
            version: 1,
            parameters: {},
            translations: [],
          }),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body).toEqual(created);
      });

      it('when invalid body is sent (validation error), then it returns 400 with error details', async () => {
        const { createQuestionRouter } = await import(
          '../../controllers/question.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const errors = [
          { field: 'question_symbol', message: 'question_symbol is required and must be a non-empty string' },
          { field: 'type', message: 'type must be one of: free-text, range, select, multiselect, radio' },
        ];
        const service = makeService({
          createQuestion: vi.fn().mockImplementation(() => {
            throw new QuestionValidationError(errors);
          }),
        });
        const app = appWithUser(user).route('/', createQuestionRouter(service));

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
        const { createQuestionRouter } = await import(
          '../../controllers/question.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: [] };
        const app = appWithUser(user).route('/', createQuestionRouter(makeService()));

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
      it('when the question exists, then it returns 200 with the question', async () => {
        const { createQuestionRouter } = await import(
          '../../controllers/question.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const question = {
          question_id: 'q-1',
          collection_id: 'col-1',
          question_symbol: 'q1',
          type: 'free-text',
          version: 1,
          parameters: {},
          created_at: '',
          updated_at: '',
          translations: [],
        };
        const service = makeService({ getQuestion: vi.fn().mockReturnValue(question) });
        const app = appWithUser(user).route('/', createQuestionRouter(service));

        const res = await app.request('http://localhost/q-1');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(question);
      });

      it('when the question does not exist, then it returns 404', async () => {
        const { createQuestionRouter } = await import(
          '../../controllers/question.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ getQuestion: vi.fn().mockReturnValue(undefined) });
        const app = appWithUser(user).route('/', createQuestionRouter(service));

        const res = await app.request('http://localhost/nonexistent');

        expect(res.status).toBe(404);
      });
    });
  });

  describe('PUT /:id', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when the question exists and valid data is sent, then it returns 200 with the updated question', async () => {
        const { createQuestionRouter } = await import(
          '../../controllers/question.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const updated = {
          question_id: 'q-1',
          collection_id: 'col-1',
          question_symbol: 'q1-updated',
          type: 'free-text',
          version: 1,
          parameters: {},
          created_at: '',
          updated_at: '',
          translations: [],
        };
        const service = makeService({ updateQuestion: vi.fn().mockReturnValue(updated) });
        const app = appWithUser(user).route('/', createQuestionRouter(service));

        const res = await app.request('http://localhost/q-1', {
          method: 'PUT',
          body: JSON.stringify({ question_symbol: 'q1-updated' }),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(updated);
      });

      it('when the question does not exist, then it returns 404', async () => {
        const { createQuestionRouter } = await import(
          '../../controllers/question.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ updateQuestion: vi.fn().mockReturnValue(undefined) });
        const app = appWithUser(user).route('/', createQuestionRouter(service));

        const res = await app.request('http://localhost/nonexistent', {
          method: 'PUT',
          body: JSON.stringify({ question_symbol: 'q1-updated' }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(404);
      });

      it('when invalid data is sent (validation error), then it returns 400', async () => {
        const { createQuestionRouter } = await import(
          '../../controllers/question.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const errors = [
          { field: 'version', message: 'version must be >= 1' },
        ];
        const service = makeService({
          updateQuestion: vi.fn().mockImplementation(() => {
            throw new QuestionValidationError(errors);
          }),
        });
        const app = appWithUser(user).route('/', createQuestionRouter(service));

        const res = await app.request('http://localhost/q-1', {
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
      it('when the question exists, then it returns 200 with success', async () => {
        const { createQuestionRouter } = await import(
          '../../controllers/question.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ deleteQuestion: vi.fn().mockReturnValue(true) });
        const app = appWithUser(user).route('/', createQuestionRouter(service));

        const res = await app.request('http://localhost/q-1', { method: 'DELETE' });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ success: true });
      });

      it('when the question does not exist, then it returns 404', async () => {
        const { createQuestionRouter } = await import(
          '../../controllers/question.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ deleteQuestion: vi.fn().mockReturnValue(false) });
        const app = appWithUser(user).route('/', createQuestionRouter(service));

        const res = await app.request('http://localhost/nonexistent', { method: 'DELETE' });

        expect(res.status).toBe(404);
      });
    });
  });
});

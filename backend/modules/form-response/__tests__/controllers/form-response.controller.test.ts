import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import type { AuthUser } from '../../../../src/types/auth.types.js';
import type { IFormResponseService } from '../../services/form-response.service.js';
import {
  FormResponseAuthorizationError,
  FormResponseImmutabilityError,
  FormResponseSubmissionError,
  FormResponseVersionConflictError,
} from '../../types/form-response.types.js';

// Mock audit module — use vi.hoisted to ensure variable is available when vi.mock factory runs
const mockAudit = vi.hoisted(() => ({ authSuccess: vi.fn(), authFailure: vi.fn(), authDenied: vi.fn(), access: vi.fn() }));
vi.mock('../../../../src/utils/audit.js', () => ({ audit: mockAudit }));

function makeService(overrides: Partial<IFormResponseService> = {}): IFormResponseService {
  return {
    listGroups: vi.fn().mockReturnValue([]),
    getGroup: vi.fn().mockReturnValue(undefined),
    createGroup: vi.fn().mockReturnValue({ form_response_group_id: 'frg-1' }),
    deleteGroup: vi.fn().mockReturnValue(true),
    listResponses: vi.fn().mockReturnValue([]),
    getResponse: vi.fn().mockReturnValue(undefined),
    createResponse: vi.fn().mockReturnValue({
      form_response_id: 'fr-1',
      form_response_group_id: 'frg-1',
      collection_id: 'coll-1',
      form_symbol: 'form-a',
      form_version: 1,
      organization_id: 'org-1',
      user_id: 'user-1',
      filling_user_id: 'user-1',
      status: 'Draft',
      version: 1,
      started_timestamp: new Date().toISOString(),
    }),
    updateResponse: vi.fn().mockReturnValue(undefined),
    deleteResponse: vi.fn().mockReturnValue(true),
    listQuestionResponses: vi.fn().mockReturnValue([]),
    getQuestionResponse: vi.fn().mockReturnValue(undefined),
    getQuestionResponseBySymbol: vi.fn().mockReturnValue(undefined),
    createQuestionResponse: vi.fn().mockReturnValue({
      question_response_id: 'qr-1',
      form_response_id: 'fr-1',
      collection_id: 'coll-1',
      question_symbol: 'q-1',
      question_version: 1,
    }),
    upsertQuestionResponse: vi.fn().mockReturnValue({
      question_response_id: 'qr-1',
      form_response_id: 'fr-1',
      collection_id: 'coll-1',
      question_symbol: 'q-1',
      question_version: 1,
    }),
    updateQuestionResponse: vi.fn().mockReturnValue(undefined),
    deleteQuestionResponse: vi.fn().mockReturnValue(true),
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

const patientUser: AuthUser = {
  sub: 'patient-1',
  permissions: ['form:response:read:own', 'form:response:write:own', 'form:response:submit'],
};

describe('FormResponseController (form-response)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ================================================================
  // GET / (list responses)
  // ================================================================

  describe('GET / (listResponses)', () => {
    describe('given no authenticated user', () => {
      it('returns 401', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const app = appWithUser(null).route('/', createFormResponseRouter(makeService()));
        const res = await app.request('http://localhost/');
        expect(res.status).toBe(401);
      });
    });

    describe('given an authenticated user', () => {
      it('returns 200 with the response list', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const responses = [
          { form_response_id: 'fr-1', user_id: 'patient-1', filling_user_id: 'patient-1', status: 'Draft', version: 1, organization_id: 'org-1' },
        ];
        const service = makeService({ listResponses: vi.fn().mockReturnValue(responses) });
        const app = appWithUser(patientUser).route('/', createFormResponseRouter(service));
        const res = await app.request('http://localhost/');
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toEqual(responses);
      });
    });
  });

  // ================================================================
  // POST / (create response)
  // ================================================================

  describe('POST / (createResponse)', () => {
    describe('given no authenticated user', () => {
      it('returns 401', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const app = appWithUser(null).route('/', createFormResponseRouter(makeService()));
        const res = await app.request('http://localhost/', { method: 'POST' });
        expect(res.status).toBe(401);
      });
    });

    describe('given a validated input', () => {
      it('returns 201 with the created response', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const created = {
          form_response_id: 'fr-new',
          user_id: 'patient-1',
          filling_user_id: 'patient-1',
          status: 'Draft',
          version: 1,
          organization_id: 'org-1',
        };
        const service = makeService({ createResponse: vi.fn().mockReturnValue(created) });
        const app = appWithUser(patientUser).route('/', createFormResponseRouter(service));
        const res = await app.request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(created),
        });
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body).toEqual(created);
      });
    });

    describe('given an authorization error from the service', () => {
      it('returns 403', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const service = makeService({
          createResponse: vi.fn().mockImplementation(() => {
            throw new FormResponseAuthorizationError('Not allowed');
          }),
        });
        const app = appWithUser(patientUser).route('/', createFormResponseRouter(service));
        const res = await app.request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        expect(res.status).toBe(403);
      });
    });
  });

  // ================================================================
  // GET /:id (get response)
  // ================================================================

  describe('GET /:id (getResponse)', () => {
    describe('given the response exists and is scoped to the user', () => {
      it('returns 200 with the response', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const response = {
          form_response_id: 'fr-1',
          user_id: 'patient-1',
          filling_user_id: 'patient-1',
          status: 'Draft',
          version: 1,
        };
        const service = makeService({ getResponse: vi.fn().mockReturnValue(response) });
        const app = appWithUser(patientUser).route('/', createFormResponseRouter(service));
        const res = await app.request('http://localhost/fr-1');
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual(response);
      });
    });

    describe('given the response does not exist', () => {
      it('returns 404', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const app = appWithUser(patientUser).route('/', createFormResponseRouter(makeService()));
        const res = await app.request('http://localhost/nonexistent');
        expect(res.status).toBe(404);
      });
    });
  });

  // ================================================================
  // PUT /:id (update response)
  // ================================================================

  describe('PUT /:id (updateResponse)', () => {
    describe('given a successful update', () => {
      it('returns 200 with the updated response', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const updated = {
          form_response_id: 'fr-1',
          user_id: 'patient-1',
          filling_user_id: 'patient-1',
          status: 'Draft',
          version: 2,
        };
        const service = makeService({ updateResponse: vi.fn().mockReturnValue(updated) });
        const app = appWithUser(patientUser).route('/', createFormResponseRouter(service));
        const res = await app.request('http://localhost/fr-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: 1 }),
        });
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual(updated);
      });
    });

    describe('given a version conflict', () => {
      it('returns 409', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const service = makeService({
          updateResponse: vi.fn().mockImplementation(() => {
            throw new FormResponseVersionConflictError('fr-1', 1, 2);
          }),
        });
        const app = appWithUser(patientUser).route('/', createFormResponseRouter(service));
        const res = await app.request('http://localhost/fr-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: 1 }),
        });
        expect(res.status).toBe(409);
      });
    });

    describe('given an immutability error', () => {
      it('returns 409', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const service = makeService({
          updateResponse: vi.fn().mockImplementation(() => {
            throw new FormResponseImmutabilityError('fr-1');
          }),
        });
        const app = appWithUser(patientUser).route('/', createFormResponseRouter(service));
        const res = await app.request('http://localhost/fr-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: 1 }),
        });
        expect(res.status).toBe(409);
      });
    });

    describe('given a submission error', () => {
      it('returns 400', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const service = makeService({
          updateResponse: vi.fn().mockImplementation(() => {
            throw new FormResponseSubmissionError('Cannot submit');
          }),
        });
        const app = appWithUser(patientUser).route('/', createFormResponseRouter(service));
        const res = await app.request('http://localhost/fr-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Submitted', version: 1 }),
        });
        expect(res.status).toBe(400);
      });
    });
  });

  // ================================================================
  // DELETE /:id (delete response)
  // ================================================================

  describe('DELETE /:id (deleteResponse)', () => {
    describe('given a successful deletion', () => {
      it('returns 200 with success', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const app = appWithUser(patientUser).route('/', createFormResponseRouter(makeService()));
        const res = await app.request('http://localhost/fr-1', { method: 'DELETE' });
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true });
      });
    });

    describe('given the response is not found', () => {
      it('returns 404', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const service = makeService({ deleteResponse: vi.fn().mockReturnValue(false) });
        const app = appWithUser(patientUser).route('/', createFormResponseRouter(service));
        const res = await app.request('http://localhost/nonexistent', { method: 'DELETE' });
        expect(res.status).toBe(404);
      });
    });

    describe('given an authorization error', () => {
      it('returns 403', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const service = makeService({
          deleteResponse: vi.fn().mockImplementation(() => {
            throw new FormResponseAuthorizationError('Not allowed');
          }),
        });
        const app = appWithUser(patientUser).route('/', createFormResponseRouter(service));
        const res = await app.request('http://localhost/fr-1', { method: 'DELETE' });
        expect(res.status).toBe(403);
      });
    });
  });
});

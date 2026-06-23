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

// Mock audit module
const mockAudit = vi.hoisted(() => ({ authSuccess: vi.fn(), authFailure: vi.fn(), authDenied: vi.fn(), access: vi.fn(), accessAllow: vi.fn() }));
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
      user_id: 'patient-1',
      filling_user_id: 'patient-1',
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

const noReadUser: AuthUser = {
  sub: 'no-read',
  permissions: ['form:response:write:own'],
};

const patientWithOwnResponses = {
  form_response_id: 'fr-1',
  form_response_group_id: 'frg-1',
  collection_id: 'coll-1',
  form_symbol: 'form-a',
  form_version: 1,
  organization_id: 'org-1',
  user_id: 'patient-1',
  filling_user_id: 'patient-1',
  status: 'Draft',
  version: 1,
  started_timestamp: new Date().toISOString(),
};

describe('FormResponseController', () => {
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

    describe('given a user without read permission', () => {
      it('returns 403', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const app = appWithUser(noReadUser).route('/', createFormResponseRouter(makeService()));
        const res = await app.request('http://localhost/');
        expect(res.status).toBe(403);
      });
    });

    describe('given a user with read permission', () => {
      it('returns 200 with responses', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const responses = [patientWithOwnResponses];
        const service = makeService({ listResponses: vi.fn().mockReturnValue(responses) });
        const app = appWithUser(patientUser).route('/', createFormResponseRouter(service));
        const res = await app.request('http://localhost/');
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual(responses);
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

    describe('given a user without write permission', () => {
      it('returns 403', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const noPermUser: AuthUser = { sub: 'nobody', permissions: [] };
        const app = appWithUser(noPermUser).route('/', createFormResponseRouter(makeService()));
        const res = await app.request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: 'patient-1', filling_user_id: 'patient-1' }),
        });
        expect(res.status).toBe(403);
      });
    });

    describe('given a valid self-fill request', () => {
      it('returns 201 and logs audit', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const app = appWithUser(patientUser).route('/', createFormResponseRouter(makeService()));
        const res = await app.request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patientWithOwnResponses),
        });
        expect(res.status).toBe(201);
        expect(mockAudit.accessAllow).toHaveBeenCalledOnce();
      });
    });
  });

  // ================================================================
  // GET /:id (get response)
  // ================================================================

  describe('GET /:id (getResponse)', () => {
    describe('given the response exists', () => {
      it('returns 200', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const service = makeService({ getResponse: vi.fn().mockReturnValue(patientWithOwnResponses) });
        const app = appWithUser(patientUser).route('/', createFormResponseRouter(service));
        const res = await app.request('http://localhost/fr-1');
        expect(res.status).toBe(200);
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
      it('returns 200 and logs audit', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const updated = { ...patientWithOwnResponses, version: 2 };
        const service = makeService({
          getResponse: vi.fn().mockReturnValue(patientWithOwnResponses),
          updateResponse: vi.fn().mockReturnValue(updated),
        });
        const app = appWithUser(patientUser).route('/', createFormResponseRouter(service));
        const res = await app.request('http://localhost/fr-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: 1 }),
        });
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual(updated);
        expect(mockAudit.accessAllow).toHaveBeenCalledOnce();
      });
    });

    describe('given the response is not found', () => {
      it('returns 404', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const app = appWithUser(patientUser).route('/', createFormResponseRouter(makeService()));
        const res = await app.request('http://localhost/fr-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: 1 }),
        });
        expect(res.status).toBe(404);
      });
    });

    describe('given a version conflict', () => {
      it('returns 409', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const service = makeService({
          getResponse: vi.fn().mockReturnValue(patientWithOwnResponses),
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
          getResponse: vi.fn().mockReturnValue(patientWithOwnResponses),
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
  });

  // ================================================================
  // DELETE /:id (delete response)
  // ================================================================

  describe('DELETE /:id (deleteResponse)', () => {
    describe('given a successful deletion', () => {
      it('returns 200 and logs audit', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const service = makeService({
          getResponse: vi.fn().mockReturnValue(patientWithOwnResponses),
          deleteResponse: vi.fn().mockReturnValue(true),
        });
        const app = appWithUser(patientUser).route('/', createFormResponseRouter(service));
        const res = await app.request('http://localhost/fr-1', { method: 'DELETE' });
        expect(res.status).toBe(200);
        expect(mockAudit.accessAllow).toHaveBeenCalledOnce();
      });
    });

    describe('given the response is not found', () => {
      it('returns 404', async () => {
        const { createFormResponseRouter } = await import(
          '../../controllers/form-response.controller.js'
        );
        const app = appWithUser(patientUser).route('/', createFormResponseRouter(makeService()));
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
          getResponse: vi.fn().mockReturnValue(patientWithOwnResponses),
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

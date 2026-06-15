import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { ISectionService } from '../../services/section.service.js';
import type { AuthUser } from '../../../../src/types/auth.types.js';
import { SectionValidationError } from '../../validators/section.validator.js';

const mockAudit = {
  authSuccess: vi.fn(),
  authFailure: vi.fn(),
  authDenied: vi.fn(),
  access: vi.fn(),
};
vi.mock('../../../../src/utils/audit.js', () => ({ audit: mockAudit }));

function makeService(overrides: Partial<ISectionService> = {}): ISectionService {
  return {
    listSections: vi.fn().mockReturnValue([]),
    getSection: vi.fn().mockReturnValue(undefined),
    createSection: vi.fn().mockReturnValue({
      section_id: 'sec-1',
      section_symbol: 'sec-1',
      version: 1,
      status: 'draft',
      condition_formula_id: undefined,
      section_questions: [],
      translations: [],
    }),
    updateSection: vi.fn().mockReturnValue(undefined),
    deleteSection: vi.fn().mockReturnValue(false),
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

describe('createSectionRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    describe('given no authenticated user', () => {
      it('when the request is made, then it returns 401', async () => {
        const { createSectionRouter } = await import(
          '../../controllers/section.controller.js'
        );
        const app = appWithUser(null).route('/', createSectionRouter(makeService()));

        const res = await app.request('http://localhost/');

        expect(res.status).toBe(401);
      });
    });

    describe('given an authenticated user without admin:manage', () => {
      it('when the request is made, then it returns 403', async () => {
        const { createSectionRouter } = await import(
          '../../controllers/section.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: [] };
        const app = appWithUser(user).route('/', createSectionRouter(makeService()));

        const res = await app.request('http://localhost/');

        expect(res.status).toBe(403);
      });
    });

    describe('given an authenticated user with admin:manage', () => {
      it('when the request is made, then it returns 200 with the sections', async () => {
        const { createSectionRouter } = await import(
          '../../controllers/section.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const sections = [
          {
            section_id: 'sec-1',
            section_symbol: 'sec-1',
            version: 1,
            status: 'draft',
            condition_formula_id: undefined,
            section_questions: [],
            translations: [],
          },
        ];
        const service = makeService({ listSections: vi.fn().mockReturnValue(sections) });
        const app = appWithUser(user).route('/', createSectionRouter(service));

        const res = await app.request('http://localhost/');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(sections);
      });
    });
  });

  describe('POST /', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when a valid body is sent, then it returns 201 with the created section', async () => {
        const { createSectionRouter } = await import(
          '../../controllers/section.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const created = {
          section_id: 'sec-1',
          section_symbol: 'sec-1',
          version: 1,
          status: 'draft',
          condition_formula_id: undefined,
          section_questions: [],
          translations: [],
        };
        const service = makeService({ createSection: vi.fn().mockReturnValue(created) });
        const app = appWithUser(user).route('/', createSectionRouter(service));

        const res = await app.request('http://localhost/', {
          method: 'POST',
          body: JSON.stringify({
            section_symbol: 'sec-1',
            version: 1,
            status: 'draft',
            section_questions: [],
            translations: [],
          }),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body).toEqual(created);
      });

      it('when invalid body is sent (validation error), then it returns 400 with error details', async () => {
        const { createSectionRouter } = await import(
          '../../controllers/section.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const errors = [
          { field: 'section_symbol', message: 'section_symbol is required and must be a non-empty string' },
          { field: 'status', message: 'status must be one of: draft, published' },
        ];
        const service = makeService({
          createSection: vi.fn().mockImplementation(() => {
            throw new SectionValidationError(errors);
          }),
        });
        const app = appWithUser(user).route('/', createSectionRouter(service));

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
        const { createSectionRouter } = await import(
          '../../controllers/section.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: [] };
        const app = appWithUser(user).route('/', createSectionRouter(makeService()));

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
      it('when the section exists, then it returns 200 with the section', async () => {
        const { createSectionRouter } = await import(
          '../../controllers/section.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const section = {
          section_id: 'sec-1',
          section_symbol: 'sec-1',
          version: 1,
          status: 'draft',
          condition_formula_id: undefined,
          section_questions: [],
          translations: [],
        };
        const service = makeService({ getSection: vi.fn().mockReturnValue(section) });
        const app = appWithUser(user).route('/', createSectionRouter(service));

        const res = await app.request('http://localhost/sec-1');
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(section);
      });

      it('when the section does not exist, then it returns 404', async () => {
        const { createSectionRouter } = await import(
          '../../controllers/section.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ getSection: vi.fn().mockReturnValue(undefined) });
        const app = appWithUser(user).route('/', createSectionRouter(service));

        const res = await app.request('http://localhost/nonexistent');

        expect(res.status).toBe(404);
      });
    });
  });

  describe('PUT /:id', () => {
    describe('given an authenticated user with admin:manage', () => {
      it('when the section exists and valid data is sent, then it returns 200 with the updated section', async () => {
        const { createSectionRouter } = await import(
          '../../controllers/section.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const updated = {
          section_id: 'sec-1',
          section_symbol: 'sec-1-updated',
          version: 1,
          status: 'draft',
          condition_formula_id: undefined,
          section_questions: [],
          translations: [],
        };
        const service = makeService({ updateSection: vi.fn().mockReturnValue(updated) });
        const app = appWithUser(user).route('/', createSectionRouter(service));

        const res = await app.request('http://localhost/sec-1', {
          method: 'PUT',
          body: JSON.stringify({ section_symbol: 'sec-1-updated' }),
          headers: { 'Content-Type': 'application/json' },
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(updated);
      });

      it('when the section does not exist, then it returns 404', async () => {
        const { createSectionRouter } = await import(
          '../../controllers/section.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ updateSection: vi.fn().mockReturnValue(undefined) });
        const app = appWithUser(user).route('/', createSectionRouter(service));

        const res = await app.request('http://localhost/nonexistent', {
          method: 'PUT',
          body: JSON.stringify({ section_symbol: 'updated' }),
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(404);
      });

      it('when invalid data is sent (validation error), then it returns 400', async () => {
        const { createSectionRouter } = await import(
          '../../controllers/section.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const errors = [
          { field: 'version', message: 'version must be >= 1' },
        ];
        const service = makeService({
          updateSection: vi.fn().mockImplementation(() => {
            throw new SectionValidationError(errors);
          }),
        });
        const app = appWithUser(user).route('/', createSectionRouter(service));

        const res = await app.request('http://localhost/sec-1', {
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
      it('when the section exists, then it returns 200 with success', async () => {
        const { createSectionRouter } = await import(
          '../../controllers/section.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ deleteSection: vi.fn().mockReturnValue(true) });
        const app = appWithUser(user).route('/', createSectionRouter(service));

        const res = await app.request('http://localhost/sec-1', { method: 'DELETE' });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ success: true });
      });

      it('when the section does not exist, then it returns 404', async () => {
        const { createSectionRouter } = await import(
          '../../controllers/section.controller.js'
        );
        const user: AuthUser = { sub: 'u-1', permissions: ['admin:manage'] };
        const service = makeService({ deleteSection: vi.fn().mockReturnValue(false) });
        const app = appWithUser(user).route('/', createSectionRouter(service));

        const res = await app.request('http://localhost/nonexistent', { method: 'DELETE' });

        expect(res.status).toBe(404);
      });
    });
  });
});

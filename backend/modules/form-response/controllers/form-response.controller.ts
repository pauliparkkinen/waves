import { Hono, type Context } from 'hono';
import type { IFormResponseService } from '../services/form-response.service.js';
import { FormResponseValidationError } from '../validators/form-response.validator.js';
import {
  FormResponseVersionConflictError,
  FormResponseImmutabilityError,
  FormResponseSubmissionError,
  FormResponseAuthorizationError,
} from '../types/form-response.types.js';
import { audit } from '../../../src/utils/audit.js';
import type { AuthUser } from '../../../src/types/auth.types.js';

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

function handleServiceError(c: Context, e: unknown): Response {
  if (e instanceof FormResponseValidationError) {
    return c.json({ error: 'Validation failed', errors: e.errors }, 400);
  }
  if (e instanceof FormResponseAuthorizationError) {
    return c.json({ error: e.message }, 403);
  }
  if (e instanceof FormResponseVersionConflictError) {
    return c.json({ error: e.message }, 409);
  }
  if (e instanceof FormResponseImmutabilityError) {
    return c.json({ error: e.message }, 409);
  }
  if (e instanceof FormResponseSubmissionError) {
    return c.json({ error: e.message }, 400);
  }
  return c.json({ error: e instanceof Error ? e.message : 'Internal server error' }, 500);
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function getUser(c: Context): AuthUser | undefined {
  return c.get('user');
}

/**
 * Checks that the authenticated user matches the filler of the response,
 * and that they hold the appropriate permission (self vs on-behalf).
 */
function assertWritePermission(
  user: AuthUser,
  details: { user_id: string; filling_user_id: string },
): void {
  if (details.filling_user_id !== user.sub) {
    throw new FormResponseAuthorizationError(
      'You are not authorized to modify this form response',
    );
  }
  if (details.user_id === user.sub) {
    if (!user.permissions.includes('form:response:write:own')) {
      throw new FormResponseAuthorizationError(
        'Insufficient permissions: form:response:write:own required',
      );
    }
  } else {
    if (!user.permissions.includes('form:response:write:delegate')) {
      throw new FormResponseAuthorizationError(
        'Insufficient permissions: form:response:write:delegate required',
      );
    }
  }
}

function hasAnyReadPermission(user: AuthUser): boolean {
  return (
    user.permissions.includes('form:response:read:own') ||
    user.permissions.includes('form:response:read:org') ||
    user.permissions.includes('form:response:read:delegate') ||
    user.permissions.includes('form:response:admin')
  );
}

// ---------------------------------------------------------------------------
// Audit helper
// ---------------------------------------------------------------------------

function auditMutation(
  action: string,
  user: AuthUser,
  resource: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): void {
  audit.access({ sub: user.sub, resource, action, outcome: 'allow', before, after });
}

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

export function createFormResponseRouter(service: IFormResponseService): Hono {
  const router = new Hono();

  // GET /form-response/groups/:groupId/responses
  router.get('/', (c) => {
    const user = getUser(c);
    if (!user) return c.json({ error: 'Authentication required' }, 401);
    if (!hasAnyReadPermission(user)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    try {
      const groupId = c.req.param('groupId')!;
      const responses = service.listResponses(groupId, user);
      return c.json(responses);
    } catch (e) {
      return handleServiceError(c, e);
    }
  });

  // POST /form-response/groups/:groupId/responses
  router.post('/', async (c) => {
    const user = getUser(c);
    if (!user) return c.json({ error: 'Authentication required' }, 401);
    try {
      const groupId = c.req.param('groupId')!;
      const body = (await c.req.json()) as {
        user_id?: string;
        filling_user_id?: string;
        [key: string]: unknown;
      };

      // Delegation + permission check
      assertWritePermission(user, {
        user_id: body.user_id ?? '',
        filling_user_id: body.filling_user_id ?? '',
      });

      const response = service.createResponse({
        ...body,
        form_response_group_id: groupId,
      } as any);

      auditMutation('create', user, `form-response:${response.form_response_id}`, undefined, response as unknown as Record<string, unknown>);
      return c.json(response, 201);
    } catch (e) {
      return handleServiceError(c, e);
    }
  });

  // GET /form-response/groups/:groupId/responses/:id
  router.get('/:id', (c) => {
    const user = getUser(c);
    if (!user) return c.json({ error: 'Authentication required' }, 401);
    if (!hasAnyReadPermission(user)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    try {
      const id = c.req.param('id');
      const response = service.getResponse(id, user);
      if (!response) return c.json({ error: 'Not found' }, 404);
      return c.json(response);
    } catch (e) {
      return handleServiceError(c, e);
    }
  });

  // PUT /form-response/groups/:groupId/responses/:id
  router.put('/:id', async (c) => {
    const user = getUser(c);
    if (!user) return c.json({ error: 'Authentication required' }, 401);
    try {
      const id = c.req.param('id');

      // Fetch existing to check delegation
      const existing = service.getResponse(id, user);
      if (!existing) return c.json({ error: 'Not found' }, 404);

      assertWritePermission(user, {
        user_id: existing.user_id,
        filling_user_id: existing.filling_user_id,
      });

      const body = await c.req.json();
      const before = { ...existing } as unknown as Record<string, unknown>;
      const updated = service.updateResponse(id, body);

      if (!updated) return c.json({ error: 'Not found' }, 404);
      auditMutation('update', user, `form-response:${id}`, before, updated as unknown as Record<string, unknown>);
      return c.json(updated);
    } catch (e) {
      return handleServiceError(c, e);
    }
  });

  // DELETE /form-response/groups/:groupId/responses/:id
  router.delete('/:id', async (c) => {
    const user = getUser(c);
    if (!user) return c.json({ error: 'Authentication required' }, 401);
    try {
      const id = c.req.param('id');

      // Fetch existing to check delegation
      const existing = service.getResponse(id, user);
      if (!existing) return c.json({ error: 'Not found' }, 404);

      assertWritePermission(user, {
        user_id: existing.user_id,
        filling_user_id: existing.filling_user_id,
      });

      const deleted = service.deleteResponse(id);
      if (!deleted) return c.json({ error: 'Not found' }, 404);

      auditMutation('delete', user, `form-response:${id}`, existing as unknown as Record<string, unknown>, undefined);
      return c.json({ success: true });
    } catch (e) {
      return handleServiceError(c, e);
    }
  });

  return router;
}

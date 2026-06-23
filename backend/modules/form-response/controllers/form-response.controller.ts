import { Hono, type Context } from 'hono';
import type { IFormResponseService } from '../services/form-response.service.js';
import { FormResponseValidationError } from '../validators/form-response.validator.js';
import {
  FormResponseVersionConflictError,
  FormResponseImmutabilityError,
  FormResponseSubmissionError,
  FormResponseAuthorizationError,
} from '../types/form-response.types.js';

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

export function createFormResponseRouter(service: IFormResponseService): Hono {
  const router = new Hono();

  // GET /form-response/groups/:groupId/responses
  router.get('/', (c) => {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Authentication required' }, 401);
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
    const user = c.get('user');
    if (!user) return c.json({ error: 'Authentication required' }, 401);
    try {
      const groupId = c.req.param('groupId')!;
      const body = await c.req.json();
      const response = service.createResponse({ ...body, form_response_group_id: groupId }, user);
      return c.json(response, 201);
    } catch (e) {
      return handleServiceError(c, e);
    }
  });

  // GET /form-response/groups/:groupId/responses/:id
  router.get('/:id', (c) => {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Authentication required' }, 401);
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
    const user = c.get('user');
    if (!user) return c.json({ error: 'Authentication required' }, 401);
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const response = service.updateResponse(id, body, user);
      if (!response) return c.json({ error: 'Not found' }, 404);
      return c.json(response);
    } catch (e) {
      return handleServiceError(c, e);
    }
  });

  // DELETE /form-response/groups/:groupId/responses/:id
  router.delete('/:id', async (c) => {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Authentication required' }, 401);
    try {
      const id = c.req.param('id');
      const deleted = service.deleteResponse(id, user);
      if (!deleted) return c.json({ error: 'Not found' }, 404);
      return c.json({ success: true });
    } catch (e) {
      return handleServiceError(c, e);
    }
  });

  return router;
}

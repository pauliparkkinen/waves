import { Hono } from 'hono';
import type { IFormResponseService } from '../services/form-response.service.js';
import { requirePermissions } from '../../../src/utils/auth.js';
import { FormResponseValidationError } from '../validators/form-response.validator.js';

export function createFormResponseRouter(service: IFormResponseService): Hono {
  const router = new Hono();

  // GET /form-response/groups/:groupId/responses
  router.get('/', requirePermissions(['admin:manage']), (c) => {
    const user = c.get('user')!;
    const groupId = c.req.param('groupId')!;
    try {
      const responses = service.listResponses(groupId, user);
      return c.json(responses);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Failed to list responses' }, 500);
    }
  });

  // POST /form-response/groups/:groupId/responses
  router.post('/', requirePermissions(['admin:manage']), async (c) => {
    try {
      const user = c.get('user')!;
      const groupId = c.req.param('groupId')!;
      const body = await c.req.json();
      const response = service.createResponse({ ...body, form_response_group_id: groupId }, user);
      return c.json(response, 201);
    } catch (e) {
      if (e instanceof FormResponseValidationError) {
        return c.json({ error: 'Validation failed', errors: e.errors }, 400);
      }
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: 'Failed to create response' }, 500);
    }
  });

  // GET /form-response/groups/:groupId/responses/:id
  router.get('/:id', requirePermissions(['admin:manage']), (c) => {
    const user = c.get('user')!;
    try {
      const id = c.req.param('id');
      const response = service.getResponse(id, user);
      if (!response) return c.json({ error: 'Not found' }, 404);
      return c.json(response);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Failed to get response' }, 500);
    }
  });

  // PUT /form-response/groups/:groupId/responses/:id
  router.put('/:id', requirePermissions(['admin:manage']), async (c) => {
    const user = c.get('user')!;
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const response = service.updateResponse(id, body, user);
      if (!response) return c.json({ error: 'Not found' }, 404);
      return c.json(response);
    } catch (e) {
      if (e instanceof FormResponseValidationError) {
        return c.json({ error: 'Validation failed', errors: e.errors }, 400);
      }
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: 'Failed to update response' }, 500);
    }
  });

  // DELETE /form-response/groups/:groupId/responses/:id
  router.delete('/:id', requirePermissions(['admin:manage']), async (c) => {
    try {
      const user = c.get('user')!;
      const id = c.req.param('id');
      const deleted = service.deleteResponse(id, user);
      if (!deleted) return c.json({ error: 'Not found' }, 404);
      return c.json({ success: true });
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: 'Failed to delete response' }, 500);
    }
  });

  return router;
}

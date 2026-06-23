import { Hono } from 'hono';
import type { IFormResponseService } from '../services/form-response.service.js';
import { requirePermissions } from '../../../src/utils/auth.js';

export function createFormResponseGroupRouter(service: IFormResponseService): Hono {
  const router = new Hono();

  // GET /form-response/groups
  router.get('/', requirePermissions(['form:response:admin']), (c) => {
    try {
      const groups = service.listGroups();
      return c.json(groups);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Failed to list groups' }, 500);
    }
  });

  // POST /form-response/groups
  router.post('/', requirePermissions(['form:response:admin']), async (c) => {
    try {
      const body = await c.req.json();
      const group = service.createGroup(body);
      return c.json(group, 201);
    } catch (e) {
      return c.json({ error: 'Failed to create group' }, 500);
    }
  });

  // GET /form-response/groups/:id
  router.get('/:id', requirePermissions(['form:response:admin']), (c) => {
    try {
      const id = c.req.param('id');
      const group = service.getGroup(id);
      if (!group) return c.json({ error: 'Not found' }, 404);
      return c.json(group);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Failed to get group' }, 500);
    }
  });

  // DELETE /form-response/groups/:id
  router.delete('/:id', requirePermissions(['form:response:admin']), async (c) => {
    try {
      const id = c.req.param('id');
      const deleted = service.deleteGroup(id);
      if (!deleted) return c.json({ error: 'Not found' }, 404);
      return c.json({ success: true });
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Failed to delete group' }, 500);
    }
  });

  return router;
}

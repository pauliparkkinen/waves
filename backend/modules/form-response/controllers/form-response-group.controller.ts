import { Hono } from 'hono';
import type { IFormResponseService } from '../services/form-response.service.js';
import { requirePermissions } from '../../../src/utils/auth.js';

export function createFormResponseGroupRouter(service: IFormResponseService): Hono {
  const router = new Hono();

  // GET /form-response/groups
  router.get('/', requirePermissions(['admin:manage']), (c) => {
    const user = c.get('user')!;
    try {
      const groups = service.listGroups(user);
      return c.json(groups);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Failed to list groups' }, 500);
    }
  });

  // POST /form-response/groups
  router.post('/', requirePermissions(['admin:manage']), async (c) => {
    try {
      const user = c.get('user')!;
      const body = await c.req.json();
      const group = service.createGroup(body, user);
      return c.json(group, 201);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: 'Failed to create group' }, 500);
    }
  });

  // GET /form-response/groups/:id
  router.get('/:id', requirePermissions(['admin:manage']), (c) => {
    const user = c.get('user')!;
    try {
      const id = c.req.param('id');
      const group = service.getGroup(id, user);
      if (!group) return c.json({ error: 'Not found' }, 404);
      return c.json(group);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Failed to get group' }, 500);
    }
  });

  // DELETE /form-response/groups/:id
  router.delete('/:id', requirePermissions(['admin:manage']), async (c) => {
    try {
      const user = c.get('user')!;
      const id = c.req.param('id');
      const deleted = service.deleteGroup(id, user);
      if (!deleted) return c.json({ error: 'Not found' }, 404);
      return c.json({ success: true });
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: e instanceof Error ? e.message : 'Failed to delete group' }, 500);
    }
  });

  return router;
}

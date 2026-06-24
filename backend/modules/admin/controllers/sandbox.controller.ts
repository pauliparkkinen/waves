import { Hono } from 'hono';
import type { ISandboxService } from '../services/sandbox.service.js';
import { requirePermissions } from '../../../src/utils/auth.js';

export function createSandboxRouter(service: ISandboxService): Hono {
  const router = new Hono();

  router.post('/:id/test', requirePermissions(['admin:manage']), async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();

      if (!body || typeof body.answers !== 'object' || body.answers === null || Array.isArray(body.answers)) {
        return c.json({ error: 'Invalid input: answers field is required' }, 400);
      }

      const result = service.testForm(id, body);
      return c.json(result);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Form not found')) {
        return c.json({ error: e.message }, 404);
      }
      if (e instanceof Error && e.message.startsWith('Formula not found')) {
        return c.json({ error: e.message }, 404);
      }
      return c.json({ error: e instanceof Error ? e.message : 'Failed to run sandbox test' }, 500);
    }
  });

  return router;
}

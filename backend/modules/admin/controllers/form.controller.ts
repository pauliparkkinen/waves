import { Hono } from 'hono';
import type { IFormService } from '../services/form.service.js';
import { requirePermissions } from '../../../src/utils/auth.js';
import { FormValidationError } from '../validators/form.validator.js';

export function createFormRouter(service: IFormService): Hono {
  const router = new Hono();

  router.get('/', requirePermissions(['admin:manage']), (c) => {
    const user = c.get('user')!;
    try {
      const forms = service.listForms(user);
      return c.json(forms);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Failed to list forms' }, 500);
    }
  });

  router.post('/', requirePermissions(['admin:manage']), async (c) => {
    try {
      const user = c.get('user')!;
      const body = await c.req.json();
      const form = service.createForm(body, user);
      return c.json(form, 201);
    } catch (e) {
      if (e instanceof FormValidationError) {
        return c.json({ error: 'Validation failed', errors: e.errors }, 400);
      }
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: 'Failed to create form' }, 500);
    }
  });

  router.get('/:id', requirePermissions(['admin:manage']), (c) => {
    const user = c.get('user')!;
    try {
      const id = c.req.param('id');
      const form = service.getForm(id, user);
      if (!form) return c.json({ error: 'Not found' }, 404);
      return c.json(form);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Failed to get form' }, 500);
    }
  });

  router.put('/:id', requirePermissions(['admin:manage']), async (c) => {
    const user = c.get('user')!;
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const form = service.updateForm(id, body, user);
      if (!form) return c.json({ error: 'Not found' }, 404);
      return c.json(form);
    } catch (e) {
      if (e instanceof FormValidationError) {
        return c.json({ error: 'Validation failed', errors: e.errors }, 400);
      }
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: 'Failed to update form' }, 500);
    }
  });

  router.delete('/:id', requirePermissions(['admin:manage']), (c) => {
    const user = c.get('user')!;
    try {
      const id = c.req.param('id');
      const deleted = service.deleteForm(id, user);
      if (!deleted) return c.json({ error: 'Not found' }, 404);
      return c.json({ success: true });
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: 'Failed to delete form' }, 500);
    }
  });

  return router;
}

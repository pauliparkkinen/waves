import { Hono } from 'hono';
import type { IAdminService } from '../services/admin.service.js';
import { requirePermissions } from '../../../src/utils/auth.js';

export function createAdminRouter(service: IAdminService): Hono {
  const router = new Hono();

  // GET /admin/status — unprotected
  router.get('/status', (c) => {
    return c.json(service.getStatus());
  });

  // Forms
  router.get('/forms', requirePermissions(['admin:manage']), (c) => {
    return c.json(service.listForms());
  });

  router.post('/forms', requirePermissions(['admin:manage']), async (c) => {
    try {
      const body = await c.req.json();
      const form = service.createForm(body);
      return c.json(form, 201);
    } catch (e) {
      return c.json({ error: 'Failed to create form' }, 500);
    }
  });

  router.get('/forms/:id', requirePermissions(['admin:manage']), (c) => {
    const id = c.req.param('id');
    const form = service.getForm(id);
    if (!form) return c.json({ error: 'Not found' }, 404);
    return c.json(form);
  });

  router.put('/forms/:id', requirePermissions(['admin:manage']), async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const form = service.updateForm(id, body);
      if (!form) return c.json({ error: 'Not found' }, 404);
      return c.json(form);
    } catch (e) {
      return c.json({ error: 'Failed to update form' }, 500);
    }
  });

  router.delete('/forms/:id', requirePermissions(['admin:manage']), (c) => {
    const id = c.req.param('id');
    const deleted = service.deleteForm(id);
    if (!deleted) return c.json({ error: 'Not found' }, 404);
    return c.json({ success: true });
  });

  // Formulas
  router.get('/formulas', requirePermissions(['admin:manage']), (c) => {
    return c.json(service.listFormulas());
  });

  router.post('/formulas', requirePermissions(['admin:manage']), async (c) => {
    try {
      const body = await c.req.json();
      const formula = service.createFormula(body);
      return c.json(formula, 201);
    } catch (e) {
      return c.json({ error: 'Failed to create formula' }, 500);
    }
  });

  router.get('/formulas/:id', requirePermissions(['admin:manage']), (c) => {
    const id = c.req.param('id');
    const formula = service.getFormula(id);
    if (!formula) return c.json({ error: 'Not found' }, 404);
    return c.json(formula);
  });

  router.put('/formulas/:id', requirePermissions(['admin:manage']), async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const formula = service.updateFormula(id, body);
      if (!formula) return c.json({ error: 'Not found' }, 404);
      return c.json(formula);
    } catch (e) {
      return c.json({ error: 'Failed to update formula' }, 500);
    }
  });

  router.delete('/formulas/:id', requirePermissions(['admin:manage']), (c) => {
    const id = c.req.param('id');
    const deleted = service.deleteFormula(id);
    if (!deleted) return c.json({ error: 'Not found' }, 404);
    return c.json({ success: true });
  });

  return router;
}

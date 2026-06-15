import { Hono } from 'hono';
import type { IAdminService } from '../services/admin.service.js';
import { requirePermissions } from '../../../src/utils/auth.js';

export function createAdminRouter(service: IAdminService): Hono {
  const router = new Hono();

  // GET /admin/status — unprotected
  router.get('/status', (c) => {
    return c.json(service.getStatus());
  });

  // Questions
  router.get('/questions', requirePermissions(['admin:manage']), (c) => {
    const collectionId = c.req.query('collectionId');
    return c.json(service.listQuestions(collectionId));
  });

  router.post('/questions', requirePermissions(['admin:manage']), async (c) => {
    try {
      const body = await c.req.json();
      const question = service.createQuestion(body);
      return c.json(question, 201);
    } catch (e) {
      return c.json({ error: 'Failed to create question' }, 500);
    }
  });

  router.get('/questions/:id', requirePermissions(['admin:manage']), (c) => {
    const id = c.req.param('id');
    const question = service.getQuestion(id);
    if (!question) return c.json({ error: 'Not found' }, 404);
    return c.json(question);
  });

  router.put('/questions/:id', requirePermissions(['admin:manage']), async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const question = service.updateQuestion(id, body);
      if (!question) return c.json({ error: 'Not found' }, 404);
      return c.json(question);
    } catch (e) {
      return c.json({ error: 'Failed to update question' }, 500);
    }
  });

  router.delete('/questions/:id', requirePermissions(['admin:manage']), (c) => {
    const id = c.req.param('id');
    const deleted = service.deleteQuestion(id);
    if (!deleted) return c.json({ error: 'Not found' }, 404);
    return c.json({ success: true });
  });

  // Sections
  router.get('/sections', requirePermissions(['admin:manage']), (c) => {
    return c.json(service.listSections());
  });

  router.post('/sections', requirePermissions(['admin:manage']), async (c) => {
    try {
      const body = await c.req.json();
      const section = service.createSection(body);
      return c.json(section, 201);
    } catch (e) {
      return c.json({ error: 'Failed to create section' }, 500);
    }
  });

  router.get('/sections/:id', requirePermissions(['admin:manage']), (c) => {
    const id = c.req.param('id');
    const section = service.getSection(id);
    if (!section) return c.json({ error: 'Not found' }, 404);
    return c.json(section);
  });

  router.put('/sections/:id', requirePermissions(['admin:manage']), async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const section = service.updateSection(id, body);
      if (!section) return c.json({ error: 'Not found' }, 404);
      return c.json(section);
    } catch (e) {
      return c.json({ error: 'Failed to update section' }, 500);
    }
  });

  router.delete('/sections/:id', requirePermissions(['admin:manage']), (c) => {
    const id = c.req.param('id');
    const deleted = service.deleteSection(id);
    if (!deleted) return c.json({ error: 'Not found' }, 404);
    return c.json({ success: true });
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

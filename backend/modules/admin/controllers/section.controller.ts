import { Hono } from 'hono';
import type { ISectionService } from '../services/section.service.js';
import { requirePermissions } from '../../../src/utils/auth.js';
import { SectionValidationError } from '../validators/section.validator.js';

export function createSectionRouter(service: ISectionService): Hono {
  const router = new Hono();

  router.get('/', requirePermissions(['admin:manage']), (c) => {
    const user = c.get('user')!;
    try {
      const sections = service.listSections(user);
      return c.json(sections);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Failed to list sections' }, 500);
    }
  });

  router.post('/', requirePermissions(['admin:manage']), async (c) => {
    try {
      const user = c.get('user')!;
      const body = await c.req.json();
      const section = service.createSection(body, user);
      return c.json(section, 201);
    } catch (e) {
      if (e instanceof SectionValidationError) {
        return c.json({ error: 'Validation failed', errors: e.errors }, 400);
      }
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: 'Failed to create section' }, 500);
    }
  });

  router.get('/:id', requirePermissions(['admin:manage']), (c) => {
    const user = c.get('user')!;
    try {
      const id = c.req.param('id');
      const section = service.getSection(id, user);
      if (!section) return c.json({ error: 'Not found' }, 404);
      return c.json(section);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Failed to get section' }, 500);
    }
  });

  router.put('/:id', requirePermissions(['admin:manage']), async (c) => {
    const user = c.get('user')!;
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const section = service.updateSection(id, body, user);
      if (!section) return c.json({ error: 'Not found' }, 404);
      return c.json(section);
    } catch (e) {
      if (e instanceof SectionValidationError) {
        return c.json({ error: 'Validation failed', errors: e.errors }, 400);
      }
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: 'Failed to update section' }, 500);
    }
  });

  router.delete('/:id', requirePermissions(['admin:manage']), async (c) => {
    const user = c.get('user')!;
    try {
      const id = c.req.param('id');
      const deleted = service.deleteSection(id, user);
      if (!deleted) return c.json({ error: 'Not found' }, 404);
      return c.json({ success: true });
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: 'Failed to delete section' }, 500);
    }
  });

  return router;
}

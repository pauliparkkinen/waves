import { Hono } from 'hono';
import type { ITranslationService } from '../services/translation.service.js';
import { requirePermissions } from '../../../src/utils/auth.js';
import { TranslationValidationError } from '../validators/translation.validator.js';

export function createTranslationRouter(service: ITranslationService): Hono {
  const router = new Hono();

  router.get('/', requirePermissions(['admin:manage']), (c) => {
    const user = c.get('user')!;
    const collectionId = c.req.query('collection_id');
    return c.json(service.listTranslations(collectionId, user));
  });

  router.post('/', requirePermissions(['admin:manage']), async (c) => {
    try {
      const user = c.get('user')!;
      const body = await c.req.json();
      const translation = service.createTranslation(body, user);
      return c.json(translation, 201);
    } catch (e) {
      if (e instanceof TranslationValidationError) {
        return c.json({ error: 'Validation failed', errors: e.errors }, 400);
      }
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      const message = e instanceof Error ? e.message : 'Failed to create translation';
      return c.json({ error: message }, 400);
    }
  });

  router.get('/:id', requirePermissions(['admin:manage']), (c) => {
    const user = c.get('user')!;
    const id = c.req.param('id');
    const translation = service.getTranslation(id, user);
    if (!translation) return c.json({ error: 'Not found' }, 404);
    return c.json(translation);
  });

  router.put('/:id', requirePermissions(['admin:manage']), async (c) => {
    try {
      const user = c.get('user')!;
      const id = c.req.param('id');
      const body = await c.req.json();
      const translation = service.updateTranslation(id, body, user);
      if (!translation) return c.json({ error: 'Not found' }, 404);
      return c.json(translation);
    } catch (e) {
      if (e instanceof TranslationValidationError) {
        return c.json({ error: 'Validation failed', errors: e.errors }, 400);
      }
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      const message = e instanceof Error ? e.message : 'Failed to update translation';
      return c.json({ error: message }, 400);
    }
  });

  router.delete('/:id', requirePermissions(['admin:manage']), (c) => {
    try {
      const user = c.get('user')!;
      const id = c.req.param('id');
      const deleted = service.deleteTranslation(id, user);
      if (!deleted) return c.json({ error: 'Not found' }, 404);
      return c.json({ success: true });
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      const message = e instanceof Error ? e.message : 'Failed to delete translation';
      return c.json({ error: message }, 400);
    }
  });

  return router;
}

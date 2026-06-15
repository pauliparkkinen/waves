import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ICollectionService } from '../services/collection.service.js';
import { requirePermissions } from '../../../src/utils/auth.js';
import { audit } from '../../../src/utils/audit.js';

function requireAuth(): MiddlewareHandler {
  return async (context, next) => {
    const user = context.get('user');
    if (!user) {
      const ip = context.req.header('x-forwarded-for') ?? context.req.header('x-real-ip');
      audit.authFailure({ reason: 'Authentication required', ip });
      throw new HTTPException(401, { message: 'Authentication required' });
    }
    await next();
  };
}

export function createCollectionRouter(service: ICollectionService): Hono {
  const router = new Hono();

  router.get('/', requireAuth(), (c) => {
    const user = c.get('user')!; // safe because requireAuth runs first
    try {
      return c.json(service.listCollections(user));
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Failed to list collections' }, 500);
    }
  });

  router.post('/', requirePermissions(['admin:manage']), async (c) => {
    try {
      const user = c.get('user')!; // safe because requirePermissions runs first
      const body = await c.req.json();
      const collection = service.createCollection(body, user);
      return c.json(collection, 201);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: 'Failed to create collection' }, 500);
    }
  });

  router.get('/:id', requireAuth(), (c) => {
    const user = c.get('user')!; // safe because requireAuth runs first
    try {
      const id = c.req.param('id');
      const collection = service.getCollection(id, user);
      if (!collection) return c.json({ error: 'Not found' }, 404);
      return c.json(collection);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Failed to get collection' }, 500);
    }
  });

  router.put('/:id', requireAuth(), async (c) => {
    const user = c.get('user')!; // safe because requireAuth runs first
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const collection = service.updateCollection(id, body, user);
      if (!collection) return c.json({ error: 'Not found' }, 404);
      return c.json(collection);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: 'Failed to update collection' }, 500);
    }
  });

  router.delete('/:id', requireAuth(), async (c) => {
    const user = c.get('user')!; // safe because requireAuth runs first
    try {
      const id = c.req.param('id');
      const deleted = service.deleteCollection(id, user);
      if (!deleted) return c.json({ error: 'Not found' }, 404);
      return c.json({ success: true });
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: 'Failed to delete collection' }, 500);
    }
  });

  return router;
}

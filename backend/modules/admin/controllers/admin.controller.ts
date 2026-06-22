import { Hono } from 'hono';
import type { IAdminService } from '../services/admin.service.js';
import { requirePermissions } from '../../../src/utils/auth.js';

export function createAdminRouter(service: IAdminService): Hono {
  const router = new Hono();

  // GET /admin/status — unprotected
  router.get('/status', (c) => {
    return c.json(service.getStatus());
  });

  return router;
}

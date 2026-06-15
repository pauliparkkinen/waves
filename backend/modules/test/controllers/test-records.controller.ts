import { Hono } from 'hono';
import type { ITestService } from '../services/test.service.js';
import { requirePermissions } from '../../../src/utils/auth.js';

export function createTestRecordsRouter(service: ITestService): Hono {
  const router = new Hono();

  // GET /test/records — requires the 'records:read' permission
  router.get('/', requirePermissions(['records:read']), (c) => {
    return c.json(service.listRecords());
  });

  return router;
}

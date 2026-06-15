import { Hono } from 'hono';
import type { ITestService } from '../services/test.service.js';

export function createTestRouter(service: ITestService): Hono {
  const router = new Hono();

  // GET /test
  router.get('/', (c) => {
    return c.json(service.getStatus());
  });

  // GET /test/hello/:name
  router.get('/hello/:name', (c) => {
    const name = c.req.param('name');
    return c.json(service.greet(name));
  });

  return router;
}

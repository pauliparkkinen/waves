import { Hono } from 'hono';
import type { IFormulaValueService } from '../services/formula-computation.service.js';
import { requirePermissions } from '../../../src/utils/auth.js';
import { FormulaValueValidationError } from '../validators/formula-value.validator.js';

export function createFormulaValueRouter(service: IFormulaValueService): Hono {
  const router = new Hono();

  // GET /form-response/formula-values
  router.get('/', requirePermissions(['form:response:admin']), (c) => {
    const user = c.get('user')!;
    try {
      const collectionId = c.req.query('collection_id');
      const entityId = c.req.query('entity_id');
      const formulaSymbol = c.req.query('formula_symbol');
      const values = service.listFormulaValues({ collectionId, entityId, formulaSymbol }, user);
      return c.json(values);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Failed to list formula values' }, 500);
    }
  });

  // POST /form-response/formula-values/compute
  router.post('/compute', requirePermissions(['form:response:admin']), async (c) => {
    try {
      const user = c.get('user')!;
      const body = await c.req.json();
      const value = service.computeAndStore(body, user);
      return c.json(value, 201);
    } catch (e) {
      if (e instanceof FormulaValueValidationError) {
        return c.json({ error: 'Validation failed', errors: e.errors }, 400);
      }
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: e instanceof Error ? e.message : 'Failed to compute formula value' }, 500);
    }
  });

  // GET /form-response/formula-values/:id
  router.get('/:id', requirePermissions(['form:response:admin']), (c) => {
    const user = c.get('user')!;
    try {
      const id = c.req.param('id');
      const value = service.getFormulaValue(id, user);
      if (!value) return c.json({ error: 'Not found' }, 404);
      return c.json(value);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Failed to get formula value' }, 500);
    }
  });

  // DELETE /form-response/formula-values/:id
  router.delete('/:id', requirePermissions(['form:response:admin']), async (c) => {
    try {
      const user = c.get('user')!;
      const id = c.req.param('id');
      const deleted = service.deleteFormulaValue(id, user);
      if (!deleted) return c.json({ error: 'Not found' }, 404);
      return c.json({ success: true });
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: 'Failed to delete formula value' }, 500);
    }
  });

  return router;
}

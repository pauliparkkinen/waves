import { Hono } from 'hono';
import type { IFormulaService } from '../services/formula.service.js';
import { requirePermissions } from '../../../src/utils/auth.js';
import { FormulaValidationError } from '../validators/formula.validator.js';

export function createFormulaRouter(service: IFormulaService): Hono {
  const router = new Hono();

  // GET /formulas — list all formulas (optional ?collection_id filter)
  router.get('/', requirePermissions(['admin:manage']), (c) => {
    const collectionId = c.req.query('collection_id');
    return c.json(service.listFormulas(collectionId));
  });

  // POST /formulas — create a new formula
  router.post('/', requirePermissions(['admin:manage']), async (c) => {
    try {
      const user = c.get('user')!;
      const body = await c.req.json();
      const formula = service.createFormula(body, user);
      return c.json(formula, 201);
    } catch (e) {
      if (e instanceof FormulaValidationError) {
        return c.json({ error: 'Validation failed', errors: e.errors }, 400);
      }
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      const message = e instanceof Error ? e.message : 'Failed to create formula';
      return c.json({ error: message }, 400);
    }
  });

  // GET /formulas/:id — get formula by ID
  router.get('/:id', requirePermissions(['admin:manage']), (c) => {
    const id = c.req.param('id');
    const formula = service.getFormula(id);
    if (!formula) return c.json({ error: 'Not found' }, 404);
    return c.json(formula);
  });

  // PUT /formulas/:id — update formula
  router.put('/:id', requirePermissions(['admin:manage']), async (c) => {
    try {
      const user = c.get('user')!;
      const id = c.req.param('id');
      const body = await c.req.json();
      const formula = service.updateFormula(id, body, user);
      if (!formula) return c.json({ error: 'Not found' }, 404);
      return c.json(formula);
    } catch (e) {
      if (e instanceof FormulaValidationError) {
        return c.json({ error: 'Validation failed', errors: e.errors }, 400);
      }
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      const message = e instanceof Error ? e.message : 'Failed to update formula';
      return c.json({ error: message }, 400);
    }
  });

  // DELETE /formulas/:id — delete formula
  router.delete('/:id', requirePermissions(['admin:manage']), (c) => {
    try {
      const user = c.get('user')!;
      const id = c.req.param('id');
      const deleted = service.deleteFormula(id, user);
      if (!deleted) return c.json({ error: 'Not found' }, 404);
      return c.json({ success: true });
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      const message = e instanceof Error ? e.message : 'Failed to delete formula';
      return c.json({ error: message }, 400);
    }
  });

  return router;
}

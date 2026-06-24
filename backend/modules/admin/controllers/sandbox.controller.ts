import { Hono } from 'hono';
import type { Context } from 'hono';
import type { ISandboxService } from '../services/sandbox.service.js';
import { requirePermissions } from '../../../src/utils/auth.js';

function isSandboxInput(body: unknown): body is { answers: Record<string, number | boolean | string> } {
  return (
    typeof body === 'object' &&
    body !== null &&
    !Array.isArray(body) &&
    typeof (body as Record<string, unknown>).answers === 'object' &&
    (body as Record<string, unknown>).answers !== null &&
    !Array.isArray((body as Record<string, unknown>).answers)
  );
}

export function createSandboxRouter(service: ISandboxService): Hono {
  const router = new Hono();

  function createTestHandler(entityField: 'form_id' | 'section_id' | 'question_id') {
    return async (c: Context) => {
      try {
        const id = c.req.param('id');
        const body = await c.req.json();

        if (!isSandboxInput(body)) {
          return c.json({ error: 'Invalid input: answers field is required' }, 400);
        }

        let result;
        if (entityField === 'form_id') {
          result = service.testForm(id, body);
        } else if (entityField === 'section_id') {
          result = service.testSection(id, body);
        } else {
          result = service.testQuestion(id, body);
        }
        return c.json(result);
      } catch (e) {
        if (e instanceof Error) {
          if (e.message.startsWith('Form not found') || e.message.startsWith('Section not found') || e.message.startsWith('Question not found')) {
            return c.json({ error: e.message }, 404);
          }
          if (e.message.startsWith('Formula not found')) {
            return c.json({ error: e.message }, 404);
          }
        }
        return c.json({ error: e instanceof Error ? e.message : 'Failed to run sandbox test' }, 500);
      }
    };
  }

  router.post('/forms/:id/test', requirePermissions(['admin:manage']), createTestHandler('form_id'));
  router.post('/sections/:id/test', requirePermissions(['admin:manage']), createTestHandler('section_id'));
  router.post('/questions/:id/test', requirePermissions(['admin:manage']), createTestHandler('question_id'));

  return router;
}

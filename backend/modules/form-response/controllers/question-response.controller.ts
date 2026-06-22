import { Hono } from 'hono';
import type { IFormResponseService } from '../services/form-response.service.js';
import { requirePermissions } from '../../../src/utils/auth.js';
import { FormResponseValidationError } from '../validators/form-response.validator.js';

export function createQuestionResponseRouter(service: IFormResponseService): Hono {
  const router = new Hono();

  // GET /form-response/responses/:responseId/questions
  router.get('/', requirePermissions(['admin:manage']), (c) => {
    const user = c.get('user')!;
    const responseId = c.req.param('responseId')!;
    try {
      const questions = service.listQuestionResponses(responseId, user);
      return c.json(questions);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Failed to list question responses' }, 500);
    }
  });

  // POST /form-response/responses/:responseId/questions
  router.post('/', requirePermissions(['admin:manage']), async (c) => {
    try {
      const user = c.get('user')!;
      const responseId = c.req.param('responseId')!;
      const body = await c.req.json();
      const question = service.createQuestionResponse({ ...body, form_response_id: responseId }, user);
      return c.json(question, 201);
    } catch (e) {
      if (e instanceof FormResponseValidationError) {
        return c.json({ error: 'Validation failed', errors: e.errors }, 400);
      }
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: 'Failed to create question response' }, 500);
    }
  });

  // PUT /form-response/responses/:responseId/questions/:questionSymbol
  router.put('/:questionSymbol', requirePermissions(['admin:manage']), async (c) => {
    const user = c.get('user')!;
    try {
      const responseId = c.req.param('responseId')!;
      const questionSymbol = c.req.param('questionSymbol')!;
      const body = await c.req.json();
      const question = service.upsertQuestionResponse(
        {
          form_response_id: responseId,
          collection_id: body.collection_id,
          question_symbol: questionSymbol,
          question_version: body.question_version,
          response_value_text: body.response_value_text,
          response_value_number: body.response_value_number,
          response_value_boolean: body.response_value_boolean,
        },
        user,
      );
      return c.json(question);
    } catch (e) {
      if (e instanceof FormResponseValidationError) {
        return c.json({ error: 'Validation failed', errors: e.errors }, 400);
      }
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: 'Failed to upsert question response' }, 500);
    }
  });

  // DELETE /form-response/responses/:responseId/questions/:questionSymbol
  router.delete('/:questionSymbol', requirePermissions(['admin:manage']), async (c) => {
    const user = c.get('user')!;
    try {
      const responseId = c.req.param('responseId')!;
      const questionSymbol = c.req.param('questionSymbol')!;
      const target = service.getQuestionResponseBySymbol(responseId, questionSymbol, user);
      if (!target) return c.json({ error: 'Not found' }, 404);
      const deleted = service.deleteQuestionResponse(target.question_response_id, user);
      if (!deleted) return c.json({ error: 'Not found' }, 404);
      return c.json({ success: true });
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: 'Failed to delete question response' }, 500);
    }
  });

  return router;
}

import { Hono, type Context } from 'hono';
import type { IFormResponseService } from '../services/form-response.service.js';
import { FormResponseValidationError } from '../validators/form-response.validator.js';
import {
  FormResponseVersionConflictError,
  FormResponseImmutabilityError,
  FormResponseSubmissionError,
  FormResponseAuthorizationError,
} from '../types/form-response.types.js';

function handleServiceError(c: Context, e: unknown): Response {
  if (e instanceof FormResponseValidationError) {
    return c.json({ error: 'Validation failed', errors: e.errors }, 400);
  }
  if (e instanceof FormResponseAuthorizationError) {
    return c.json({ error: e.message }, 403);
  }
  if (e instanceof FormResponseVersionConflictError) {
    return c.json({ error: e.message }, 409);
  }
  if (e instanceof FormResponseImmutabilityError) {
    return c.json({ error: e.message }, 409);
  }
  if (e instanceof FormResponseSubmissionError) {
    return c.json({ error: e.message }, 400);
  }
  return c.json({ error: e instanceof Error ? e.message : 'Internal server error' }, 500);
}

export function createQuestionResponseRouter(service: IFormResponseService): Hono {
  const router = new Hono();

  // GET /form-response/responses/:responseId/questions
  router.get('/', (c) => {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Authentication required' }, 401);
    try {
      const responseId = c.req.param('responseId')!;
      const questions = service.listQuestionResponses(responseId, user);
      return c.json(questions);
    } catch (e) {
      return handleServiceError(c, e);
    }
  });

  // POST /form-response/responses/:responseId/questions
  router.post('/', async (c) => {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Authentication required' }, 401);
    try {
      const responseId = c.req.param('responseId')!;
      const body = await c.req.json();
      const question = service.createQuestionResponse({ ...body, form_response_id: responseId }, user);
      return c.json(question, 201);
    } catch (e) {
      return handleServiceError(c, e);
    }
  });

  // PUT /form-response/responses/:responseId/questions/:questionSymbol
  router.put('/:questionSymbol', async (c) => {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Authentication required' }, 401);
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
      return handleServiceError(c, e);
    }
  });

  // DELETE /form-response/responses/:responseId/questions/:questionSymbol
  router.delete('/:questionSymbol', async (c) => {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Authentication required' }, 401);
    try {
      const responseId = c.req.param('responseId')!;
      const questionSymbol = c.req.param('questionSymbol')!;
      const target = service.getQuestionResponseBySymbol(responseId, questionSymbol, user);
      if (!target) return c.json({ error: 'Not found' }, 404);
      const deleted = service.deleteQuestionResponse(target.question_response_id, user);
      if (!deleted) return c.json({ error: 'Not found' }, 404);
      return c.json({ success: true });
    } catch (e) {
      return handleServiceError(c, e);
    }
  });

  return router;
}

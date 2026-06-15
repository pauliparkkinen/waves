import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { IQuestionService } from '../services/question.service.js';
import { requirePermissions } from '../../../src/utils/auth.js';
import { QuestionValidationError } from '../validators/question.validator.js';

export function createQuestionRouter(service: IQuestionService): Hono {
  const router = new Hono();

  router.get('/', requirePermissions(['admin:manage']), (c) => {
    const user = c.get('user')!;
    try {
      const collectionId = c.req.query('collectionId');
      const questions = service.listQuestions(collectionId, user);
      return c.json(questions);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Failed to list questions' }, 500);
    }
  });

  router.post('/', requirePermissions(['admin:manage']), async (c) => {
    try {
      const user = c.get('user')!;
      const body = await c.req.json();
      const question = service.createQuestion(body, user);
      return c.json(question, 201);
    } catch (e) {
      if (e instanceof QuestionValidationError) {
        return c.json({ error: 'Validation failed', errors: e.errors }, 400);
      }
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: 'Failed to create question' }, 500);
    }
  });

  router.get('/:id', requirePermissions(['admin:manage']), (c) => {
    const user = c.get('user')!;
    try {
      const id = c.req.param('id');
      const question = service.getQuestion(id, user);
      if (!question) return c.json({ error: 'Not found' }, 404);
      return c.json(question);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Failed to get question' }, 500);
    }
  });

  router.put('/:id', requirePermissions(['admin:manage']), async (c) => {
    const user = c.get('user')!;
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const question = service.updateQuestion(id, body, user);
      if (!question) return c.json({ error: 'Not found' }, 404);
      return c.json(question);
    } catch (e) {
      if (e instanceof QuestionValidationError) {
        return c.json({ error: 'Validation failed', errors: e.errors }, 400);
      }
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: 'Failed to update question' }, 500);
    }
  });

  router.delete('/:id', requirePermissions(['admin:manage']), async (c) => {
    const user = c.get('user')!;
    try {
      const id = c.req.param('id');
      const deleted = service.deleteQuestion(id, user);
      if (!deleted) return c.json({ error: 'Not found' }, 404);
      return c.json({ success: true });
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Insufficient permissions')) {
        return c.json({ error: e.message }, 403);
      }
      return c.json({ error: 'Failed to delete question' }, 500);
    }
  });

  return router;
}

import { Hono } from 'hono';
import { createFormResponseGroupRouter } from './controllers/form-response-group.controller.js';
import { createFormResponseRouter } from './controllers/form-response.controller.js';
import { createQuestionResponseRouter } from './controllers/question-response.controller.js';
import { createFormulaValueRouter } from './controllers/formula-value.controller.js';
import { FormResponseService } from './services/form-response.service.js';
import { FormulaValueService } from './services/formula-computation.service.js';
import { InMemoryFormResponseGroupRepository } from './repositories/form-response-group.repository.js';
import { InMemoryFormResponseRepository } from './repositories/form-response.repository.js';
import { InMemoryQuestionResponseRepository } from './repositories/question-response.repository.js';
import { InMemoryFormulaValueRepository } from './repositories/formula-value.repository.js';

// ---- Repositories ----
const groupRepository = new InMemoryFormResponseGroupRepository();
const formResponseRepository = new InMemoryFormResponseRepository();
const questionResponseRepository = new InMemoryQuestionResponseRepository();
const formulaValueRepository = new InMemoryFormulaValueRepository();

// ---- Services ----
const formResponseService = new FormResponseService(
  groupRepository,
  formResponseRepository,
  questionResponseRepository,
);
const formulaValueService = new FormulaValueService(
  formulaValueRepository,
);

// ---- Router ----
const router = new Hono();
router.route('/groups', createFormResponseGroupRouter(formResponseService));
router.route('/groups/:groupId/responses', createFormResponseRouter(formResponseService));
router.route('/responses/:responseId/questions', createQuestionResponseRouter(formResponseService));
router.route('/formula-values', createFormulaValueRouter(formulaValueService));

export default router;

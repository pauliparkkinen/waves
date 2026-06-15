import { Hono } from 'hono';
import { createAdminRouter } from './controllers/admin.controller.js';
import { AdminService } from './services/admin.service.js';
import { InMemoryAdminRepository } from './repositories/admin.repository.js';
import { createCollectionRouter } from './controllers/collection.controller.js';
import { CollectionService } from './services/collection.service.js';
import { InMemoryCollectionRepository } from './repositories/collection.repository.js';
import { createQuestionRouter } from './controllers/question.controller.js';
import { QuestionService } from './services/question.service.js';
import { InMemoryQuestionRepository } from './repositories/question.repository.js';

const adminRepository = new InMemoryAdminRepository();
const adminService = new AdminService(adminRepository);
const collectionRepository = new InMemoryCollectionRepository();
const collectionService = new CollectionService(collectionRepository);
const questionRepository = new InMemoryQuestionRepository();
const questionService = new QuestionService(questionRepository);

const router = new Hono();
router.route('/', createAdminRouter(adminService));
router.route('/collections', createCollectionRouter(collectionService));
router.route('/questions', createQuestionRouter(questionService));
export default router;

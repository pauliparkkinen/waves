import { Hono } from 'hono';
import { createTestRouter } from './controllers/test.controller.js';
import { createTestRecordsRouter } from './controllers/test-records.controller.js';
import { TestService } from './services/test.service.js';
import { InMemoryTestRepository } from './repositories/test.repository.js';

const repository = new InMemoryTestRepository();
const service = new TestService(repository);

const router = new Hono();
router.route('/', createTestRouter(service));
router.route('/records', createTestRecordsRouter(service));

export default router;

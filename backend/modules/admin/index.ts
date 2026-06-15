import { Hono } from 'hono';
import { createAdminRouter } from './controllers/admin.controller.js';
import { AdminService } from './services/admin.service.js';
import { InMemoryAdminRepository } from './repositories/admin.repository.js';

const repository = new InMemoryAdminRepository();
const service = new AdminService(repository);
const router = new Hono();
router.route('/', createAdminRouter(service));
export default router;

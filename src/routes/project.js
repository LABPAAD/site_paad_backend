import { Router } from 'express';
import { createProject, getAllProjects, updateProject } from '../controllers/projectController.js';
// import { requireAuth } from '../middleware/auth.js';
// import { requireRole } from '../middleware/rbac.js';

const router = Router();

router.post('/', createProject);
router.get('/', getAllProjects);
router.put('/:id', updateProject);

export default router;

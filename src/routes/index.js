import { Router } from 'express';
import userRoutes from './user.js';
import projectRoutes from './project.js';

const router = Router();

router.use('/user', userRoutes);
router.use('/projects', projectRoutes);

export default router;
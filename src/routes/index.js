import { Router } from 'express';
import userRoutes from './user.js';
import projectRoutes from './project.js';
import authRoutes from './auth.js';

const router = Router();

router.use('/user', userRoutes);
router.use('/projects', projectRoutes);
router.use('/auth', authRoutes);

export default router;
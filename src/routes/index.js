import { Router } from 'express';
import userRoutes from './user.js';
import projectRoutes from './project.js';
import authRoutes from './auth.js';
import publicationRoutes from "./publication.js";

const router = Router();

router.use('/user', userRoutes);
router.use('/projects', projectRoutes);
router.use('/auth', authRoutes);
router.use("/publications", publicationRoutes);

export default router;
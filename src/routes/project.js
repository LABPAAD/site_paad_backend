// src/routes/project.js
import { Router } from 'express';
import {
  createProject,
  getAllProjects,
  updateProject,
} from '../controllers/projectController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// POST /api/projects
// Permitido: COORDENADOR, ADMINISTRADOR
router.post(
  '/',
  requireAuth,
  requireRole(['COORDENADOR', 'ADMINISTRADOR']),
  createProject
);

// GET /api/projects
// Pública (Visitante) por enquanto
router.get('/', getAllProjects);

// PUT /api/projects/:id
// Permitido: COORDENADOR, ADMINISTRADOR
// Regra "apenas dono" fica pra BD-005
router.put(
  '/:id',
  requireAuth,
  requireRole(['COORDENADOR', 'ADMINISTRADOR']),
  updateProject
);

export default router;
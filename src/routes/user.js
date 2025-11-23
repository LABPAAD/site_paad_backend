import { Router } from 'express';
import {
  createUser,
  getUserByRole,
  getAllUsers,
  getUserByAdvisor,
  updateData
} from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// POST /api/users/cadastrar-aluno
// Permitido: COORDENADOR, ADMINISTRADOR, MONITOR
router.post(
  '/cadastrar-aluno',
  requireAuth,
  requireRole(['COORDENADOR', 'ADMINISTRADOR', 'MONITOR']),
  createUser
);

// GET /api/users/buscar
// Permitido: COORDENADOR, ADMINISTRADOR
router.get(
  '/buscar',
  requireAuth,
  // requireRole(['COORDENADOR', 'ADMINISTRADOR']),
  getAllUsers
);

// GET /api/users/buscar-role
// Permitido: COORDENADOR, ADMINISTRADOR
router.get(
  '/buscar-role',
  requireAuth,
  requireRole(['COORDENADOR', 'ADMINISTRADOR']),
  getUserByRole
);

// GET /api/users/buscar-por-orientador
// Permitido: COORDENADOR, ADMINISTRADOR
router.get(
  '/buscar-por-orientador',
  requireAuth,
  requireRole(['COORDENADOR', 'ADMINISTRADOR']),
  getUserByAdvisor
);


// PUT /api/users/atualizar-dados
router.put(
  '/atualizar-dados',
  requireAuth,
  updateData
)

export default router;

import { Router } from 'express';
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  inactivateUser,
} from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

/**
 * Base: /api/user
 *
 * As rotas abaixo assumem que este router está montado em src/routes/index.js como:
 *   router.use('/user', userRoutes);
 *
 * Assim, os endpoints expostos são:
 *   - POST   /api/user/        → Criar pessoa (User)
 *   - GET    /api/user/        → Listar pessoas com filtros (?role=&status=&advisorId=)
 *   - GET    /api/user/:id     → Detalhar pessoa por ID
 *   - PUT    /api/user/:id     → Atualizar dados de uma pessoa
 *   - DELETE /api/user/:id     → Desativar pessoa (status = INATIVO, soft delete)
 */

/**
 * POST /api/user/
 * Cria uma nova pessoa (User).
 * Permissões: COORDENADOR, ADMINISTRADOR, MONITOR
 *
 * Observações de negócio:
 * - Se role === 'DISCENTE', advisorId é obrigatório.
 * - Se o criador for MONITOR, o usuário é criado como INATIVO e sem approvedBy (BD-007).
 */
router.post(
  '/',
  requireAuth,
  requireRole(['COORDENADOR', 'ADMINISTRADOR', 'MONITOR']),
  createUser
);

/**
 * GET /api/user/
 * Lista pessoas com filtros opcionais:
 *   - ?role=COORDENADOR|ADMINISTRADOR|MONITOR|DISCENTE
 *   - ?status=ATIVO|INATIVO|EGRESSO
 *   - ?advisorId=<id do orientador>
 *
 * Sempre omite campos sensíveis (password, twoFactorSecret, etc).
 */
router.get(
  '/',
  getAllUsers
);

/**
 * GET /api/user/:id
 * Obtém os dados de uma pessoa específica.
 *
 * Inclui relações úteis:
 *   - advisor (orientador)
 *   - advisees (orientandos)
 *   - projectsAsMember
 */
router.get(
  '/:id',
  getUserById
);

/**
 * PUT /api/user/:id
 * Atualiza dados de uma pessoa (User).
 *
 * Campos típicos: email, fullName, level, researchArea, linkLattes,
 * currentLink, status, role, advisorId, etc.
 *
 * Permissões: COORDENADOR, ADMINISTRADOR, MONITOR
 * (a lógica mais fina de quem pode editar o quê fica no service – BD-003, BD-005, etc.)
 */
router.put(
  '/:id',
  requireAuth,
  requireRole(['COORDENADOR', 'ADMINISTRADOR', 'MONITOR']),
  updateUser
);

/**
 * DELETE /api/user/:id
 * Desativa uma pessoa (soft delete).
 *
 * Em vez de remover o registro, altera:
 *   status = INATIVO
 *
 * Permissões: COORDENADOR, ADMINISTRADOR
 *
 * Observação:
 * - BD-010: mudança de status deve gerar histórico em UserHistory (feito no service futuramente).
 * - BD-011: ação deve ser registrada no AuditLog (gancho no service).
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole(['COORDENADOR', 'ADMINISTRADOR']),
  inactivateUser
);

export default router;
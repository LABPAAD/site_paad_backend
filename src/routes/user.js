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
 * Montagem esperada em src/routes/index.js:
 *   router.use('/user', userRoutes);
 *
 * Endpoints expostos:
 *   - POST   /api/user/        → Criar pessoa (User)
 *   - GET    /api/user/        → Listar pessoas com filtros (?role=&status=&advisorId=&labBond=&q=)
 *   - GET    /api/user/:id     → Detalhar pessoa por ID
 *   - PUT    /api/user/:id     → Atualizar dados de uma pessoa
 *   - DELETE /api/user/:id     → Desativar pessoa (status = INATIVO, soft delete)
 */

/**
 * POST /api/user/
 * Cria uma nova pessoa (User).
 *
 * Permissões:
 * - COORDENADOR
 * - LAB_DOCENTE  (novo papel de docente/orientador)
 * - MONITOR
 *
 * Compatibilidade:
 * - ADMINISTRADOR é aceito no requireRole apenas por legado, mas no service
 *   é normalizado para LAB_DOCENTE (BD-015).
 *
 * Observações de negócio (UserService.create):
 * - Discentes (role DISCENTE legado OU USUARIO com labBond DISCENTE)
 *   devem ter advisorId definido.
 * - Se o criador for MONITOR, o usuário nasce como INATIVO e sem approvedBy/approvedAt
 *   (solicitação para aprovação posterior).
 */
router.post(
  '/',
  requireAuth,
  requireRole([
    'COORDENADOR',
    'LAB_DOCENTE',
    'ADMINISTRADOR', // legado → tratado como LAB_DOCENTE no service
    'MONITOR',
  ]),
  createUser
);

/**
 * GET /api/user/
 * Lista pessoas com filtros opcionais:
 *   - ?role=COORDENADOR|LAB_DOCENTE|MONITOR|USUARIO|ADMINISTRADOR|DISCENTE
 *   - ?status=ATIVO|INATIVO|EGRESSO
 *   - ?advisorId=<id do orientador>
 *   - ?labBond=DOCENTE|DISCENTE|VISITANTE
 *   - ?q=<busca por nome/email>  (planejado para uso futuro)
 *
 * Esta rota é PÚBLICA:
 * - Se não houver usuário autenticado (sem req.user),
 *   o controller chama o service em modo `publicView = true`,
 *   permitindo aplicar regras de LGPD nas respostas públicas.
 *
 * Os campos sensíveis (password, twoFactorSecret, tokens de reset)
 * são sempre omitidos via UserService.toSafeUser.
 */
router.get('/', getAllUsers);

/**
 * GET /api/user/:id
 * Obtém os dados de uma pessoa específica.
 *
 * Inclui relações úteis (via UserRepository.findById):
 *   - advisor (orientador principal legado)
 *   - advisees (orientandos legados)
 *   - projectsAsMember
 *   - projectsAsCoord
 *   - avatarFile
 *
 * Esta rota também é PÚBLICA:
 * - Em ausência de req.user, o service é chamado com `publicView = true`
 *   para permitir aplicação futura de regras de LGPD no detalhe público.
 */
router.get('/:id', getUserById);

/**
 * PUT /api/user/:id
 * Atualiza dados de uma pessoa (User).
 *
 * Campos típicos:
 *   email, fullName, level, researchArea, linkLattes,
 *   currentLink, status, role, advisorId,
 *   labBond, program, institution, unitOrDepartment,
 *   bio, slug, flags de LGPD/perfil público etc.
 *
 * Permissões:
 * - COORDENADOR
 * - LAB_DOCENTE
 * - MONITOR
 * - ADMINISTRADOR (legado, normalizado para LAB_DOCENTE no service)
 *
 * Regras de negócio adicionais ficam no UserService.updateUser:
 * - LAB_DOCENTE não pode promover/definir COORDENADOR nem LAB_DOCENTE.
 * - Discentes continuam obrigados a ter advisorId.
 */
router.put(
  '/:id',
  requireAuth,
  requireRole([
    'COORDENADOR',
    'LAB_DOCENTE',
    'ADMINISTRADOR', // legado
    'MONITOR',
  ]),
  updateUser
);

/**
 * DELETE /api/user/:id
 * Desativa uma pessoa (soft delete).
 *
 * Em vez de remover o registro, altera:
 *   status = INATIVO
 *
 * Permissões:
 * - COORDENADOR
 * - LAB_DOCENTE
 * - ADMINISTRADOR (legado)
 *
 * Observações:
 * - BD-010: mudança de status deverá gerar histórico em UserHistory/UserLabBondHistory
 *   (hooks previstos no service).
 * - BD-011: ação deverá ser registrada no AuditLog (hook previsto no service).
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole([
    'COORDENADOR',
    'LAB_DOCENTE',
    'ADMINISTRADOR', // legado
  ]),
  inactivateUser
);

export default router;
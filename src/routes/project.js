// src/routes/project.js
import { Router } from "express";
import {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  inactivateProject,
} from "../controllers/projectController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = Router();

/**
 * Base: /api/projects
 *
 * Endpoints:
 *   - POST   /api/projects/        → Criar projeto (restrito)
 *   - GET    /api/projects/        → Listar projetos (público, com filtros)
 *   - GET    /api/projects/:id     → Detalhar projeto (público)
 *   - PUT    /api/projects/:id     → Atualizar projeto (restrito)
 *   - DELETE /api/projects/:id     → Desativar projeto (soft delete, restrito)
 */

/**
 * POST /api/projects/
 * Criação de projeto.
 *
 * Permissões (BD-015 / BD-003):
 * - COORDENADOR
 * - LAB_DOCENTE   (substitui o antigo ADMINISTRADOR)
 */
router.post(
  "/",
  requireAuth,
  requireRole(["COORDENADOR", "LAB_DOCENTE"]),
  createProject
);

/**
 * GET /api/projects/
 * Lista projetos com filtros opcionais:
 *   - ?status=ATIVO|ENCERRADO|INATIVO
 *   - ?type=...
 *   - ?coordinatorId=<id de User>
 *
 * Endpoint público (Visitante pode acessar).
 */
router.get("/", getAllProjects);

/**
 * GET /api/projects/:id
 * Detalhe de um projeto específico.
 *
 * Endpoint público.
 */
router.get("/:id", getProjectById);

/**
 * PUT /api/projects/:id
 * Atualiza dados de um projeto.
 *
 * Permissões:
 * - requireAuth
 * - requireRole(['COORDENADOR', 'LAB_DOCENTE'])
 *
 * Regra de negócio (implementada no service):
 * - COORDENADOR pode editar qualquer projeto;
 * - LAB_DOCENTE apenas se for o coordinator do projeto.
 */
router.put(
  "/:id",
  requireAuth,
  requireRole(["COORDENADOR", "LAB_DOCENTE"]),
  updateProject
);

/**
 * DELETE /api/projects/:id
 * Soft delete (status = INATIVO).
 *
 * Permissões:
 * - requireAuth
 * - requireRole(['COORDENADOR', 'LAB_DOCENTE'])
 *
 * Regra de negócio (implementada no service):
 * - COORDENADOR pode desativar qualquer projeto;
 * - LAB_DOCENTE apenas se for o coordinator do projeto.
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole(["COORDENADOR", "LAB_DOCENTE"]),
  inactivateProject
);

export default router;
import { Router } from "express";
import {
  createPublication,
  getAllPublications,
  getPublicationById,
  updatePublication,
  deletePublication,
} from "../controllers/publicationController.js";

import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = Router();

/**
 * POST /api/publications/
 * Criar publicação
 * Acesso: COORDENADOR, LAB_DOCENTE, MONITOR, USUARIO
 */
router.post(
  "/",
  requireAuth,
  requireRole(["COORDENADOR", "LAB_DOCENTE", "MONITOR", "USUARIO"]),
  createPublication
);

/**
 * GET /api/publications/
 * Lista pública com filtros
 */
router.get("/", getAllPublications);

/**
 * GET /api/publications/:id
 * Pública
 */
router.get("/:id", getPublicationById);

/**
 * PUT /api/publications/:id
 * Atualizar publicação
 * Acesso: COORDENADOR, LAB_DOCENTE, MONITOR, USUARIO
 */
router.put(
  "/:id",
  requireAuth,
  requireRole(["COORDENADOR", "LAB_DOCENTE", "MONITOR", "USUARIO"]),
  updatePublication
);

/**
 * DELETE /api/publications/:id
 * Exclusão definitiva (hard delete)
 * Acesso: COORDENADOR, LAB_DOCENTE
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole(["COORDENADOR", "LAB_DOCENTE"]),
  deletePublication
);

export default router;
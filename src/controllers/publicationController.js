import { PublicationService } from "../service/publicationService.js";

/**
 * POST /api/publications/
 * Cria nova publicação.
 */
export const createPublication = async (req, res) => {
  try {
    const requester = req.user; // obtido via requireAuth
    const publication = await PublicationService.createPublication(
      req.body,
      requester
    );
    return res.status(201).json(publication);
  } catch (error) {
    console.error("Erro ao criar publicação:", error);
    const status = error.statusCode || 400;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * GET /api/publications/
 * Listagem pública com filtros.
 */
export const getAllPublications = async (req, res) => {
  try {
    const {
      authorId,
      year,
      projectId,
      venue,
      q,
    } = req.query;

    const requester = req.user || null;
    const publicView = !requester;

    const publications = await PublicationService.getAllPublications(
      { authorId, year, projectId, venue, q },
      { publicView }
    );

    return res.status(200).json(publications);
  } catch (error) {
    console.error("Erro ao listar publicações:", error);
    const status = error.statusCode || 400;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * GET /api/publications/:id
 * Detalhar publicação
 */
export const getPublicationById = async (req, res) => {
  try {
    const requester = req.user || null;
    const publicView = !requester;

    const publication = await PublicationService.getPublicationById(
      req.params.id,
      { publicView }
    );

    return res.status(200).json(publication);
  } catch (error) {
    console.error("Erro ao buscar publicação:", error);
    const status = error.statusCode || 400;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * PUT /api/publications/:id
 * Atualizar publicação
 */
export const updatePublication = async (req, res) => {
  try {
    const requester = req.user;

    const updated = await PublicationService.updatePublication(
      req.params.id,
      req.body,
      requester
    );

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Erro ao atualizar publicação:", error);
    const status = error.statusCode || 400;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * DELETE /api/publications/:id
 * Exclusão DEFINITIVA (hard delete)
 */
export const deletePublication = async (req, res) => {
  try {
    const requester = req.user;

    const deleted = await PublicationService.deletePublication(
      req.params.id,
      requester
    );

    return res.status(200).json(deleted);
  } catch (error) {
    console.error("Erro ao excluir publicação:", error);
    const status = error.statusCode || 400;
    return res.status(status).json({ message: error.message });
  }
};
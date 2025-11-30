import { PublicationRepository } from "../repositories/publicationRepository.js";
// import { AuditService } from "./auditService.js"; // [BD-011] futuro

/**
 * Normaliza roles legados para o modelo atual (BD-015).
 *
 * - ADMINISTRADOR → LAB_DOCENTE
 * - DISCENTE      → USUARIO
 */
function normalizeRole(role) {
  if (!role) return null;
  if (role === "ADMINISTRADOR") return "LAB_DOCENTE";
  if (role === "DISCENTE") return "USUARIO";
  return role;
}

/**
 * Obtém o role efetivo do requester, já normalizado.
 */
function getEffectiveRequesterRole(requester) {
  if (!requester?.role) return null;
  return normalizeRole(requester.role);
}

/**
 * Verifica se um determinado usuário é autor PAAD da publicação.
 */
function isPaadAuthor(publication, userId) {
  if (!publication?.paadAuthors || !userId) return false;
  return publication.paadAuthors.some((author) => author.id === userId);
}

export class PublicationService {
  /**
   * Criação de publicação.
   *
   * Regras:
   * - requireAuth + requireRole(['COORDENADOR', 'LAB_DOCENTE', 'MONITOR', 'USUARIO']) (na rota)
   * - Validação mínima: title, year, venue
   * - Relacionamentos:
   *    - paadAuthorIds → paadAuthors.connect
   *    - projectIds    → projects.connect
   *    - authors       → autores externos (string[])
   */
  static async createPublication(input, requester) {
    const {
      title,
      year,
      venue,
      doi,
      authors, // autores externos (string[])
      paadAuthorIds = [], // ids de User internos
      projectIds = [], // ids de Project
    } = input;

    // Validações obrigatórias (RF33)
    if (!title || !year || !venue) {
      const error = new Error(
        "Campos obrigatórios ausentes: title, year, venue."
      );
      error.statusCode = 400;
      throw error;
    }

    const parsedYear = Number(year);
    if (Number.isNaN(parsedYear)) {
      const error = new Error("O campo 'year' deve ser um número válido.");
      error.statusCode = 400;
      throw error;
    }

    // Garante que authors seja sempre um array de string
    let externalAuthors = [];
    if (Array.isArray(authors)) {
      externalAuthors = authors;
    } else if (typeof authors === "string" && authors.trim() !== "") {
      externalAuthors = [authors];
    }

    const data = {
      title,
      year: parsedYear,
      venue,
      ...(doi !== undefined && { doi }),
      authors: externalAuthors,
    };

    // Relacionamento com autores internos (User[])
    if (paadAuthorIds && paadAuthorIds.length > 0) {
      data.paadAuthors = {
        connect: paadAuthorIds.map((id) => ({ id })),
      };
    }

    // Relacionamento com projetos (Project[])
    if (projectIds && projectIds.length > 0) {
      data.projects = {
        connect: projectIds.map((id) => ({ id })),
      };
    }

    const publication = await PublicationRepository.create(data);

    // TODO[BD-011]: AuditLog - PUBLICATION_CREATE
    // if (typeof AuditService?.logAction === "function") {
    //   await AuditService.logAction(requester?.id || null, "publication.create", {
    //     publicationId: publication.id,
    //     title: publication.title,
    //   });
    // }

    return publication;
  }

  /**
   * Listagem de publicações (endpoint público).
   *
   * Filtros aceitos:
   * - authorId
   * - year
   * - projectId
   * - venue
   * - q (busca por título/venue/autores externos)
   *
   * options.publicView existe para futura aplicação de LGPD, se necessário.
   */
  static async getAllPublications(filters = {}, options = {}) {
    const { publicView = true } = options; // hoje não muda nada, mas já fica preparado

    const { authorId, year, projectId, venue, q } = filters;

    const publications = await PublicationRepository.getAll({
      authorId,
      year,
      projectId,
      venue,
      q,
    });

    // Futuro: se publicView === true, poderíamos mascarar dados sensíveis
    return publications;
  }

  /**
   * Detalhe de uma publicação por ID.
   *
   * Endpoint público: options.publicView = true
   */
  static async getPublicationById(id, options = {}) {
    const { publicView = true } = options;

    const publication = await PublicationRepository.findById(id);

    if (!publication) {
      const error = new Error("Publicação não encontrada.");
      error.statusCode = 404;
      throw error;
    }

    // Futuro: se publicView === true, aplicar regras de LGPD se necessário.
    return publication;
  }

  /**
   * Atualização de publicação.
   *
   * RBAC (BD-006 + BD-015):
   * - COORDENADOR → pode editar qualquer publicação.
   * - LAB_DOCENTE → pode editar se for um dos paadAuthors
   *                 (futuro: ou vinculado via projetos).
   * - MONITOR     → pode editar apenas se for paadAuthor.
   * - USUARIO     → pode editar apenas se for paadAuthor.
   */
  static async updatePublication(id, input, requester) {
    const existing = await PublicationRepository.findById(id);

    if (!existing) {
      const error = new Error("Publicação não encontrada.");
      error.statusCode = 404;
      throw error;
    }

    const requesterId = requester?.id || null;
    const role = getEffectiveRequesterRole(requester);

    // --- Regras de permissão ---

    if (!role) {
      const error = new Error("Permissão negada.");
      error.statusCode = 403;
      throw error;
    }

    if (role === "COORDENADOR") {
      // pode tudo
    } else if (role === "LAB_DOCENTE") {
      // LAB_DOCENTE: hoje exigimos que seja paadAuthor.
      // Futuro: também poderá editar se estiver vinculado via projetos da publicação.
      if (!isPaadAuthor(existing, requesterId)) {
        const error = new Error(
          "LAB_DOCENTE só pode editar publicações das quais é autor."
        );
        error.statusCode = 403;
        throw error;
      }
    } else if (role === "MONITOR" || role === "USUARIO") {
      // MONITOR/USUARIO: apenas se for paadAuthor
      if (!isPaadAuthor(existing, requesterId)) {
        const error = new Error(
          "Você só pode editar publicações das quais é autor."
        );
        error.statusCode = 403;
        throw error;
      }
    } else {
      const error = new Error("Permissão negada.");
      error.statusCode = 403;
      throw error;
    }

    // --- Montagem dos dados para update ---

    const {
      title,
      year,
      venue,
      doi,
      authors,
      paadAuthorIds,
      projectIds,
    } = input;

    const dataToUpdate = {};

    if (title !== undefined) dataToUpdate.title = title;
    if (year !== undefined) {
      const parsedYear = Number(year);
      if (Number.isNaN(parsedYear)) {
        const error = new Error("O campo 'year' deve ser um número válido.");
        error.statusCode = 400;
        throw error;
      }
      dataToUpdate.year = parsedYear;
    }
    if (venue !== undefined) dataToUpdate.venue = venue;
    if (doi !== undefined) dataToUpdate.doi = doi;

    if (authors !== undefined) {
      if (Array.isArray(authors)) {
        dataToUpdate.authors = authors;
      } else if (typeof authors === "string" && authors.trim() !== "") {
        dataToUpdate.authors = [authors];
      } else {
        dataToUpdate.authors = [];
      }
    }

    // Atualização de relacionamentos:
    if (paadAuthorIds !== undefined) {
      dataToUpdate.paadAuthors = {
        set: paadAuthorIds.map((id) => ({ id })),
      };
    }

    if (projectIds !== undefined) {
      dataToUpdate.projects = {
        set: projectIds.map((id) => ({ id })),
      };
    }

    const updated = await PublicationRepository.update(id, dataToUpdate);

    // TODO[BD-011]: AuditLog - PUBLICATION_UPDATE (registrar old/new)
    // if (typeof AuditService?.logAction === "function") {
    //   await AuditService.logAction(requesterId, "publication.update", {
    //     publicationId: updated.id,
    //   });
    // }

    return updated;
  }

  /**
   * Exclusão de publicação (hard delete).
   *
   * Regras BD-006 + BD-015:
   * - requireAuth + requireRole(['COORDENADOR', 'LAB_DOCENTE']) (na rota)
   * - COORDENADOR → pode excluir qualquer publicação.
   * - LAB_DOCENTE → só pode excluir se for paadAuthor da publicação
   *                 (futuro: ou vinculado via projetos).
   */
  static async deletePublication(id, requester) {
    const existing = await PublicationRepository.findById(id);

    if (!existing) {
      const error = new Error("Publicação não encontrada.");
      error.statusCode = 404;
      throw error;
    }

    const requesterId = requester?.id || null;
    const role = getEffectiveRequesterRole(requester);

    if (!role) {
      const error = new Error("Permissão negada.");
      error.statusCode = 403;
      throw error;
    }

    if (role === "COORDENADOR") {
      // pode tudo
    } else if (role === "LAB_DOCENTE") {
      if (!isPaadAuthor(existing, requesterId)) {
        const error = new Error(
          "LAB_DOCENTE só pode excluir publicações das quais é autor."
        );
        error.statusCode = 403;
        throw error;
      }
    } else {
      // MONITOR/USUARIO (ou qualquer outro): bloqueado na rota, mas reforçamos aqui.
      const error = new Error("Você não tem permissão para excluir publicações.");
      error.statusCode = 403;
      throw error;
    }

    const deleted = await PublicationRepository.delete(id);

    // TODO[BD-011]: AuditLog - PUBLICATION_DELETE
    // if (typeof AuditService?.logAction === "function") {
    //   await AuditService.logAction(requesterId, "publication.delete", {
    //     publicationId: id,
    //     title: existing.title,
    //   });
    // }

    return deleted;
  }
}
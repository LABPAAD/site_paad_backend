import { prisma } from "../config/db.js";

/**
 * Repositório de Publicações (Publication)
 *
 * Responsável por isolar o acesso ao banco via Prisma,
 * expondo operações de CRUD usadas pelo service.
 */
export class PublicationRepository {
  /**
   * Cria uma nova publicação com seus relacionamentos.
   *
   * @param {object} data - Dados já saneados para criação.
   * @returns {Promise<object>} Publicação criada com autores e projetos.
   */
  static async create(data) {
    return prisma.publication.create({
      data,
      include: {
        paadAuthors: {
          select: {
            id: true,
            fullName: true,
          },
        },
        projects: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  /**
   * Busca uma publicação por ID, incluindo autores e projetos.
   *
   * @param {string} id - ID da publicação.
   * @returns {Promise<object|null>} Publicação encontrada ou null.
   */
  static async findById(id) {
    return prisma.publication.findUnique({
      where: { id },
      include: {
        paadAuthors: {
          select: {
            id: true,
            fullName: true,
          },
        },
        projects: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  /**
   * Lista publicações com filtros opcionais.
   *
   * Filtros suportados:
   * - authorId   → paadAuthors.some.id
   * - projectId  → projects.some.id
   * - year       → year = Number(year)
   * - venue      → venue exato
   * - q          → busca textual em title, venue e autores externos
   *
   * @param {object} filters
   * @returns {Promise<object[]>}
   */
  static async getAll(filters = {}) {
    const { authorId, projectId, year, venue, q } = filters;

    const where = {};

    if (authorId) {
      where.paadAuthors = {
        some: { id: authorId },
      };
    }

    if (projectId) {
      where.projects = {
        some: { id: projectId },
      };
    }

    if (year) {
      const parsedYear = Number(year);
      if (!Number.isNaN(parsedYear)) {
        where.year = parsedYear;
      }
    }

    if (venue) {
      where.venue = venue;
    }

    if (q) {
      where.OR = [
        {
          title: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          venue: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          // autores externos (array de strings)
          authors: {
            has: q,
          },
        },
      ];
    }

    return prisma.publication.findMany({
      where,
      include: {
        paadAuthors: {
          select: {
            id: true,
            fullName: true,
          },
        },
        projects: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        year: "desc",
      },
    });
  }

  /**
   * Atualiza uma publicação por ID.
   *
   * @param {string} id
   * @param {object} data - Dados já preparados pelo service (incluindo connect/set).
   * @returns {Promise<object>} Publicação atualizada.
   */
  static async update(id, data) {
    return prisma.publication.update({
      where: { id },
      data,
      include: {
        paadAuthors: {
          select: {
            id: true,
            fullName: true,
          },
        },
        projects: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  /**
   * Exclui definitivamente uma publicação (hard delete).
   *
   * @param {string} id
   * @returns {Promise<object>} Publicação removida.
   */
  static async delete(id) {
    return prisma.publication.delete({
      where: { id },
    });
  }
}
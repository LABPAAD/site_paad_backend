import { prisma } from '../config/db.js';

export class ProjectRepository {
  /**
   * Cria um novo projeto com seus relacionamentos principais.
   */
  static async create(data) {
    return prisma.project.create({
      data,
      include: {
        coordinator: {
          select: { id: true, fullName: true, email: true },
        },
        team: {
          select: { id: true, fullName: true },
        },
        publications: true,
        softwares: true,
      },
    });
  }

  /**
   * Busca um projeto por ID, incluindo relações relevantes.
   */
  static async findById(id) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        coordinator: {
          select: { id: true, fullName: true, email: true },
        },
        team: {
          select: { id: true, fullName: true },
        },
        publications: true,
        softwares: true,
      },
    });
  }

  /**
   * Lista projetos com filtros opcionais:
   * - status (ProjectStatus)
   * - type   (string)
   * - coordinatorId (id de User)
   */
  static async getAll(filters = {}) {
    const { status, type, coordinatorId } = filters;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (coordinatorId) {
      where.coordinatorId = coordinatorId;
    }

    return prisma.project.findMany({
      where,
      include: {
        coordinator: {
          select: { id: true, fullName: true, email: true },
        },
        team: {
          select: { id: true, fullName: true },
        },
        publications: true,
        softwares: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  /**
   * Atualiza um projeto por ID, retornando já com as relações principais.
   */
  static async update(id, data) {
    return prisma.project.update({
      where: { id },
      data,
      include: {
        coordinator: {
          select: { id: true, fullName: true, email: true },
        },
        team: {
          select: { id: true, fullName: true },
        },
        publications: true,
        softwares: true,
      },
    });
  }

  /**
   * Soft delete de projeto:
   * - status → INATIVO
   */
  static async softDelete(id) {
    return prisma.project.update({
      where: { id },
      data: {
        status: 'INATIVO',
      },
      include: {
        coordinator: {
          select: { id: true, fullName: true, email: true },
        },
        team: {
          select: { id: true, fullName: true },
        },
        publications: true,
        softwares: true,
      },
    });
  }
}
import { prisma } from '../config/db.js';

export class UserRepository {
  static async create(data) {
    return prisma.user.create({ data });
  }

  static async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Buscar usuário por ID com relações úteis:
   * - advisor (orientador)
   * - advisees (orientandos)
   * - projectsAsMember (projetos em que participa)
   */
  static async findById(id) {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        advisor: true,
        advisees: true,
        projectsAsMember: true,
      },
    });
  }

  /**
   * Lista usuários com filtros opcionais:
   * - role
   * - status
   * - advisorId
   */
  static async getAll(filters = {}) {
    const { role, status, advisorId } = filters;

    const where = {};

    if (role) where.role = role;
    if (status) where.status = status;
    if (advisorId) where.advisorId = advisorId;

    return await prisma.user.findMany({ where });
  }

  // LEGACY – será removido quando todos estiverem usando GET /api/user/?role=
  static async getByRole(role) {
    return await prisma.user.findMany({
      where: { role },
    });
  }

  // LEGACY – será removido quando todos estiverem usando GET /api/user/?advisorId=
  static async getByAdvsiorId(advisorId) {
    return await prisma.user.findMany({
      where: { advisorId },
    });
  }

  static async update(data) {
    const { id, ...rest } = data;
    return await prisma.user.update({
      where: { id },
      data: rest,
    });
  }

  /**
   * Atualizar por ID com objeto de dados já saneado.
   */
  static async updateById(id, data) {
    return await prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete: status = INATIVO
   */
  static async inactivate(id) {
    return await prisma.user.update({
      where: { id },
      data: {
        status: 'INATIVO',
      },
    });
  }
} 

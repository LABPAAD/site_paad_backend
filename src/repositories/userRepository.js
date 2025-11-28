import { prisma } from "../config/db.js";

export class UserRepository {
  /**
   * Cria um novo usuário.
   */
  static async create(data) {
    return prisma.user.create({ data });
  }

  /**
   * Busca usuário por e-mail.
   */
  static async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Buscar usuário por ID com relações úteis:
   * - advisor (orientador principal legado)
   * - advisees (orientandos legados)
   * - advisors (lista de orientadores/coorientadores via UserAdvisor)
   * - coAdvisees (usuários que este usuário orienta via UserAdvisor)
   * - projectsAsMember (projetos em que participa)
   * - projectsAsCoord (projetos que coordena)
   * - avatarFile (foto de perfil)
   */
  static async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        advisor: true,
        advisees: true,
        advisors: {
          include: {
            advisor: true,
          },
        },
        coAdvisees: {
          include: {
            user: true,
          },
        },
        projectsAsMember: true,
        projectsAsCoord: true,
        avatarFile: true,
      },
    });
  }

  /**
   * Lista usuários com filtros opcionais:
   * - role
   * - status
   * - advisorId
   * - labBond
   * - q (busca por nome/email - opcional)
   *
   * Pensado para atender tanto uso interno quanto páginas públicas.
   */
  static async getAll(filters = {}) {
    const { role, status, advisorId, labBond, q } = filters;

    const where = {};

    if (role) where.role = role;
    if (status) where.status = status;
    if (advisorId) where.advisorId = advisorId;
    if (labBond) where.labBond = labBond;

    if (q && q.trim()) {
      const term = q.trim();
      where.OR = [
        { fullName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ];
    }

    return prisma.user.findMany({
      where,
      orderBy: {
        fullName: "asc",
      },
      include: {
        avatarFile: true,
      },
    });
  }

  /**
   * LEGACY – será removido quando todos estiverem usando GET /api/user/?role=
   */
  static async getByRole(role) {
    return prisma.user.findMany({
      where: { role },
    });
  }

  /**
   * LEGACY – será removido quando todos estiverem usando GET /api/user/?advisorId=
   */
  static async getByAdvsiorId(advisorId) {
    return prisma.user.findMany({
      where: { advisorId },
    });
  }

  /**
   * Atualização genérica (LEGACY).
   */
  static async update(data) {
    const { id, ...rest } = data;
    return prisma.user.update({
      where: { id },
      data: rest,
    });
  }

  /**
   * Atualizar por ID com objeto de dados já saneado.
   */
  static async updateById(id, data) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete: status = INATIVO.
   */
  static async inactivate(id) {
    return prisma.user.update({
      where: { id },
      data: {
        status: "INATIVO",
      },
    });
  }

  /**
   * Cria um registro de histórico de vínculo (UserLabBondHistory).
   * Usado no BD-015 na criação de usuário e, futuramente, em mudanças de vínculo.
   */
  static async createLabBondHistory(data) {
    return prisma.userLabBondHistory.create({ data });
  }
}
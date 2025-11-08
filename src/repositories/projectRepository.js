import { prisma } from '../config/db.js';

export class ProjectRepository {
  static async create(data) {
    return prisma.project.create({
      data,
      include: {
        coordinator: { select: { id: true, fullName: true, email: true } },
        team: { select: { id: true, fullName: true } },
        publications: true,
        softwares: true
      }
    });
  }

  static async findById(id) {
    return prisma.project.findUnique({ where: { id } });
  }

  static async getAll() {
    return prisma.project.findMany();
  }

  static async update(id, data) {
    return prisma.project.update({
        where: { id },
        data,
        include: {
            coordinator: { select: { id: true, fullName: true, email: true } },
            team: { select: { id: true, fullName: true } },
            publications: true,
            softwares: true
        }
    });
  }
}
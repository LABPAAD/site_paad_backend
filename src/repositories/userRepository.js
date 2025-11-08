import { prisma } from '../config/db.js';

export class UserRepository {
    static async create(data) {
        return prisma.user.create({ data });
    }

    static async findByEmail(email) {
        return await prisma.user.findUnique({
            where: {email}
        });
    }

    static async getAll() {
        return await prisma.user.findMany();
    }

    static async getByRole(role) {
        return await prisma.user.findMany({
            where: {role}
        });
    }

    static async getByAdvsiorId(advisorId) {
        return await prisma.user.findMany({
            where: {advisorId}
        });
    }
}
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

    static async update(data) {
        const { id, ...rest } = data;
        return await prisma.user.update({
            where: { id },
            data: rest
        });
    }


    // static async updateStatus(id, status) {
    //     return await prisma.user.update({
    //         where: {id},
    //         status
    //     });
    // }
}
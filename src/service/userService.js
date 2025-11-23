import { UserRepository } from "../repositories/userRepository.js";
import bcrypt from 'bcryptjs';

export class UserService {
    static async create(input, requesterId) {
      const {
      email,
      password,
      role,
      status = 'ATIVO',
      fullName,
      level,
      researchArea,
      currentLink,
      linkLattes,
      orcid,
      consentGiven = false,
      consentDate,
      advisorId
    } = input;

    if (!email || !fullName) {
      throw new Error('Email e nome completo são obrigatórios.');
    }

    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      throw new Error('Já existe um usuário com este e-mail.');
    }

    if (role === 'DISCENTE') {
      if (!advisorId) {
        throw new Error('Discentes devem ter um orientador definido.');
      }
    }

    const hashedPassword = password ? await bcrypt.hash(password, 12) : null;

    const userData = {
      email,
      fullName,
      role,
      status,
      password: hashedPassword,
      ...(level !== undefined && { level }),
      ...(researchArea !== undefined && { researchArea }),
      ...(currentLink !== undefined && { currentLink }),
      ...(linkLattes !== undefined && { linkLattes }),
      ...(orcid !== undefined && { orcid }),
      consentGiven,
      ...(consentGiven && consentDate ? { consentDate: new Date(consentDate) } : {}),
      ...(advisorId !== undefined && { advisorId }),
      createdBy: requesterId
    };

    const user = await UserRepository.create(userData);

    return user;
  }

  static async getAllUsers() {
    const users = await UserRepository.getAll();

    return users.map(({ password, twoFactorSecret, ...safeUser }) => safeUser);
  } 

  static async getUserByRole(input) {
    const {role} = input;

    const users = await UserRepository.getByRole(role);

    return users;
  }

  static async getByAdvsiorId(input) {
    const {advisorId} = input;

    const users = await UserRepository.getByAdvsiorId(advisorId);

    return users;
  }

  static async updateData(input) {
    const updatedData = await UserRepository.update(input);

    return updatedData;
  }
};

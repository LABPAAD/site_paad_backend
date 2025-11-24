import { UserRepository } from "../repositories/userRepository.js";
import bcrypt from 'bcryptjs';

export class UserService {
  /**
   * Criação de usuário (Pessoa)
   */
  static async create(input, requester) {
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
      advisorId,
    } = input;

    if (!email || !fullName) {
      const error = new Error('Email e nome completo são obrigatórios.');
      error.statusCode = 400;
      throw error;
    }

    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      const error = new Error('Já existe um usuário com este e-mail.');
      error.statusCode = 409;
      throw error;
    }

    if (role === 'DISCENTE' && !advisorId) {
      const error = new Error('Discentes devem ter um orientador definido.');
      error.statusCode = 400;
      throw error;
    }

    const requesterId = requester?.id || null;
    const requesterRole = requester?.role || null;

    let finalStatus = status;
    let approvedBy = undefined;
    let approvedAt = undefined;

    if (requesterRole === 'MONITOR') {
      // [DEP. BD-007] Aprovação posterior
      finalStatus = 'INATIVO';
      approvedBy = null;
      approvedAt = null;
    } else if (requesterId) {
      approvedBy = requesterId;
      approvedAt = new Date();
    }

    const hashedPassword = password ? await bcrypt.hash(password, 12) : null;

    const userData = {
      email,
      fullName,
      role,
      status: finalStatus,
      password: hashedPassword,
      ...(level !== undefined && { level }),
      ...(researchArea !== undefined && { researchArea }),
      ...(currentLink !== undefined && { currentLink }),
      ...(linkLattes !== undefined && { linkLattes }),
      ...(orcid !== undefined && { orcid }),
      consentGiven,
      ...(consentGiven && consentDate ? { consentDate: new Date(consentDate) } : {}),
      ...(advisorId !== undefined && { advisorId }),
      createdBy: requesterId,
      ...(approvedBy !== undefined && { approvedBy }),
      ...(approvedAt !== undefined && { approvedAt }),
    };

    const user = await UserRepository.create(userData);

    // TODO[BD-011]: AuditLog - USER_CREATE

    const { password: _pw, twoFactorSecret, passwordResetToken, passwordResetExpires, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Listagem com filtros de role, status e advisorId.
   */
  static async getAllUsers(filters = {}) {
    const users = await UserRepository.getAll(filters);

    return users.map(({ password, twoFactorSecret, passwordResetToken, passwordResetExpires, ...safeUser }) => safeUser);
  }

  /**
   * Buscar usuário por ID (com relações).
   */
  static async getById(id) {
    const user = await UserRepository.findById(id);

    if (!user) {
      const error = new Error('Usuário não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    const {
      password,
      twoFactorSecret,
      passwordResetToken,
      passwordResetExpires,
      ...safeUser
    } = user;

    return safeUser;
  }

  /**
   * Atualizar usuário por ID.
   * [DEP. BD-003] Regras de permissão mais detalhadas podem ser aplicadas aqui.
   */
  static async updateUser(id, input, requester) {
    const {
      email,
      fullName,
      level,
      researchArea,
      currentLink,
      linkLattes,
      orcid,
      status,
      role,
      advisorId,
      consentGiven,
      consentDate,
    } = input;

    const existing = await UserRepository.findById(id);
    if (!existing) {
      const error = new Error('Usuário não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    // Validação de e-mail único (se mudou)
    if (email && email !== existing.email) {
      const emailOwner = await UserRepository.findByEmail(email);
      if (emailOwner && emailOwner.id !== id) {
        const error = new Error('Já existe um usuário com este e-mail.');
        error.statusCode = 409;
        throw error;
      }
    }

    // [DEP. BD-003]: Aqui poderíamos validar se requester pode modificar esse usuário
    // (ex: ADMIN só edita orientandos, etc.)

    const dataToUpdate = {
      ...(email !== undefined && { email }),
      ...(fullName !== undefined && { fullName }),
      ...(level !== undefined && { level }),
      ...(researchArea !== undefined && { researchArea }),
      ...(currentLink !== undefined && { currentLink }),
      ...(linkLattes !== undefined && { linkLattes }),
      ...(orcid !== undefined && { orcid }),
      ...(status !== undefined && { status }),
      ...(role !== undefined && { role }),
      ...(advisorId !== undefined && { advisorId }),
      ...(consentGiven !== undefined && { consentGiven }),
      ...(consentDate !== undefined && { consentDate: consentDate ? new Date(consentDate) : null }),
    };

    const updated = await UserRepository.updateById(id, dataToUpdate);

    // TODO[BD-010]: Registrar mudanças no UserHistory
    // TODO[BD-011]: AuditLog - USER_UPDATE

    const {
      password,
      twoFactorSecret,
      passwordResetToken,
      passwordResetExpires,
      ...safeUser
    } = updated;

    return safeUser;
  }

  /**
   * Soft delete: status = INATIVO.
   */
  static async inactivateUser(id, requester) {
    const existing = await UserRepository.findById(id);
    if (!existing) {
      const error = new Error('Usuário não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    // [DEP. BD-003]: Podemos impedir que o usuário inative a si mesmo, etc.

    const updated = await UserRepository.inactivate(id);

    // TODO[BD-010]: Registrar mudança de status no UserHistory
    // TODO[BD-011]: AuditLog - USER_INACTIVATE

    const {
      password,
      twoFactorSecret,
      passwordResetToken,
      passwordResetExpires,
      ...safeUser
    } = updated;

    return safeUser;
  }

  // --- LEGACY (ainda usados por rotas antigas) ---

  static async getUserByRole(input) {
    const { role } = input;
    const users = await UserRepository.getByRole(role);
    return users;
  }

  static async getByAdvsiorId(input) {
    const { advisorId } = input;
    const users = await UserRepository.getByAdvsiorId(advisorId);
    return users;
  }

  static async updateData(input) {
    const updatedData = await UserRepository.update(input);
    return updatedData;
  }
}; 

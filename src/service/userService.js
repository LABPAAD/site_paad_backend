import { UserRepository } from "../repositories/userRepository.js";
import bcrypt from "bcryptjs";

/**
 * Normaliza roles legados para o novo modelo BD-015.
 *
 * - ADMINISTRADOR → LAB_DOCENTE
 * - DISCENTE      → USUARIO
 * - Demais valores são mantidos.
 */
function normalizeRole(role) {
  if (!role) return undefined;

  if (role === "ADMINISTRADOR") return "LAB_DOCENTE";
  if (role === "DISCENTE") return "USUARIO";

  return role;
}

/**
 * Aplica normalização de role para o "requester" (quem está criando/alterando).
 */
function getEffectiveRequesterRole(requester) {
  if (!requester?.role) return null;
  return normalizeRole(requester.role);
}

/**
 * Verifica se um dado role representa um usuário "discente"
 * para fins de obrigatoriedade de orientador.
 *
 * Regra de compatibilidade:
 * - role === "DISCENTE" (legado)
 * - role === "USUARIO" com labBond === "DISCENTE"
 */
function isStudentRole(role, labBond) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "USUARIO" && labBond === "DISCENTE") return true;
  if (role === "DISCENTE") return true; // compatibilidade com dados antigos
  return false;
}

/**
 * Cria registro de histórico de vínculo, se o repositório suportar.
 * Não quebra a aplicação caso o método ainda não exista.
 */
async function maybeCreateLabBondHistory({ user, labBond, role, status, createdBy }) {
  if (
    !user ||
    !labBond ||
    typeof UserRepository.createLabBondHistory !== "function"
  ) {
    return;
  }

  await UserRepository.createLabBondHistory({
    userId: user.id,
    labBond,
    role,
    status,
    startDate: new Date(),
    createdBy: createdBy || null,
  });
}

/**
 * Remove campos sensíveis do objeto de usuário antes de retornar.
 */
function toSafeUser(user) {
  if (!user) return user;

  const {
    password,
    twoFactorSecret,
    passwordResetToken,
    passwordResetExpires,
    ...safeUser
  } = user;

  return safeUser;
}

export class UserService {
  /**
   * Criação de usuário (Pessoa)
   *
   * Regras BD-015:
   * - Roles válidos: COORDENADOR, LAB_DOCENTE, MONITOR, USUARIO (+ legados).
   * - LAB_DOCENTE NÃO pode criar COORDENADOR nem LAB_DOCENTE.
   * - MONITOR sempre cria "solicitação" → status INATIVO, sem approvedBy/approvedAt.
   * - COORDENADOR (e LAB_DOCENTE) podem aprovar diretamente (approvedBy/approvedAt).
   * - Discentes (USUARIO com labBond DISCENTE ou role DISCENTE legado)
   *   DEVEM ter advisorId.
   */
  static async create(input, requester) {
    const {
      email,
      password,
      role: rawRole, // pode vir ADMINISTRADOR/DISCENTE de clientes antigos
      status: rawStatus,
      fullName,
      level,
      researchArea,
      currentLink,
      linkLattes,
      orcid,
      consentGiven = false,
      consentDate,
      advisorId,
      // novos campos BD-015
      labBond,
      program,
      institution,
      unitOrDepartment,
      bio,
      slug,
      publicProfileEnabled,
      allowPublicEmail,
      allowPublicPersonalLinks,
      allowPublicAvatar,
    } = input;

    if (!email || !fullName) {
      const error = new Error("Email e nome completo são obrigatórios.");
      error.statusCode = 400;
      throw error;
    }

    // Garante que nunca criamos usuários com e-mail duplicado
    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      const error = new Error("Já existe um usuário com este e-mail.");
      error.statusCode = 409;
      throw error;
    }

    const requesterId = requester?.id || null;
    const requesterRole = getEffectiveRequesterRole(requester);

    // Normaliza role de entrada para o novo enum (LAB_DOCENTE / USUARIO / etc.)
    const normalizedRole = normalizeRole(rawRole) || "USUARIO";
    const status = rawStatus || "ATIVO";

    // Regras de quem pode criar o quê (RBAC de criação)
    // COORDENADOR → pode tudo
    // LAB_DOCENTE → NÃO pode criar/prometer COORDENADOR nem LAB_DOCENTE
    // MONITOR    → pode solicitar qualquer role, mas SEM aprovação (status INATIVO)
    if (requesterRole === "LAB_DOCENTE") {
      if (normalizedRole === "COORDENADOR" || normalizedRole === "LAB_DOCENTE") {
        const error = new Error(
          "LAB_DOCENTE não tem permissão para criar ou promover COORDENADOR ou LAB_DOCENTE."
        );
        error.statusCode = 403;
        throw error;
      }
    }

    // Regra de discente: precisa ter orientador
    if (isStudentRole(rawRole || normalizedRole, labBond) && !advisorId) {
      const error = new Error("Discentes devem ter um orientador definido.");
      error.statusCode = 400;
      throw error;
    }

    // Lógica de aprovação e status inicial
    let finalStatus = status;
    let approvedBy = undefined;
    let approvedAt = undefined;

    if (requesterRole === "MONITOR") {
      // MONITOR sempre cria "solicitação" pendente
      finalStatus = "INATIVO";
      approvedBy = null;
      approvedAt = null;
    } else if (requesterId) {
      // COORDENADOR ou LAB_DOCENTE (ou outros perfis privilegiados)
      approvedBy = requesterId;
      approvedAt = new Date();
    }

    // Gera hash da senha, se enviada
    const hashedPassword = password ? await bcrypt.hash(password, 12) : null;

    const userData = {
      email,
      fullName,
      role: normalizedRole,
      status: finalStatus,
      password: hashedPassword,
      ...(level !== undefined && { level }),
      ...(researchArea !== undefined && { researchArea }),
      ...(currentLink !== undefined && { currentLink }),
      ...(linkLattes !== undefined && { linkLattes }),
      ...(orcid !== undefined && { orcid }),

      // Campos de vínculo e contexto acadêmico
      ...(labBond !== undefined && { labBond }),
      ...(program !== undefined && { program }),
      ...(institution !== undefined && { institution }),
      ...(unitOrDepartment !== undefined && { unitOrDepartment }),

      // LGPD / perfil público
      consentGiven,
      ...(consentGiven && consentDate
        ? { consentDate: new Date(consentDate) }
        : {}),
      ...(publicProfileEnabled !== undefined && { publicProfileEnabled }),
      ...(allowPublicEmail !== undefined && { allowPublicEmail }),
      ...(allowPublicPersonalLinks !== undefined && {
        allowPublicPersonalLinks,
      }),
      ...(allowPublicAvatar !== undefined && { allowPublicAvatar }),

      // Conteúdo público extra
      ...(bio !== undefined && { bio }),
      ...(slug !== undefined && { slug }),

      // Orientador principal (legado)
      ...(advisorId !== undefined && { advisorId }),

      // Metadados de criação/aprovação
      createdBy: requesterId,
      ...(approvedBy !== undefined && { approvedBy }),
      ...(approvedAt !== undefined && { approvedAt }),
    };

    const user = await UserRepository.create(userData);

    // Histórico de vínculo inicial (BD-015)
    await maybeCreateLabBondHistory({
      user,
      labBond: user.labBond || null,
      role: user.role,
      status: user.status,
      createdBy: requesterId,
    });

    // TODO[BD-011]: AuditLog - USER_CREATE

    return toSafeUser(user);
  }

  /**
   * Listagem com filtros de role, status, advisorId, labBond.
   *
   * `filters` pode conter:
   * - role
   * - status
   * - advisorId
   * - labBond
   * - q (busca por nome/email) -> será tratado no UserRepository futuramente.
   *
   * `options`:
   * - publicView?: boolean → quando true, futuramente aplicará regras LGPD
   *   específicas para respostas públicas (já preparado para isso).
   */
  static async getAllUsers(filters = {}, options = {}) {
    const { publicView = false } = options;

    // Clona filtros para não mutar o objeto recebido
    const effectiveFilters = { ...filters };

    // Normaliza role de filtro (ADMINISTRADOR → LAB_DOCENTE, DISCENTE → USUARIO)
    if (effectiveFilters.role) {
      effectiveFilters.role = normalizeRole(effectiveFilters.role);
    }

    const users = await UserRepository.getAll(effectiveFilters);

    const safeUsers = users.map(toSafeUser);

    // Futuro: aplicar LGPD diferente para respostas públicas
    // if (publicView) { ... }
    return safeUsers;
  }

  /**
   * Buscar usuário por ID (com relações).
   *
   * `options.publicView` será usado futuramente para mascarar dados
   * em contexto público (LGPD), sem quebrar o uso interno.
   */
  static async getById(id, options = {}) {
    const { publicView = false } = options;

    const user = await UserRepository.findById(id);

    if (!user) {
      const error = new Error("Usuário não encontrado.");
      error.statusCode = 404;
      throw error;
    }

    const safeUser = toSafeUser(user);

    // Futuro: se publicView === true, aplicar regras de LGPD mais estritas
    // (ex.: esconder email/currentLink se consentGiven === false).
    // if (publicView) { ... }

    return safeUser;
  }

  /**
   * Atualizar usuário por ID.
   *
   * Regras BD-015:
   * - LAB_DOCENTE não pode promover usuários para COORDENADOR/LAB_DOCENTE.
   * - Garante unicidade de e-mail.
   * - Prepara terreno para atualizar histórico de vínculo (LabBondHistory)
   *   quando status/role/labBond mudarem (TODO).
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
      role: rawRole,
      advisorId,
      consentGiven,
      consentDate,

      // novos campos BD-015
      labBond,
      program,
      institution,
      unitOrDepartment,
      bio,
      slug,
      publicProfileEnabled,
      allowPublicEmail,
      allowPublicPersonalLinks,
      allowPublicAvatar,
    } = input;

    const existing = await UserRepository.findById(id);
    if (!existing) {
      const err = new Error("Usuário não encontrado.");
      err.statusCode = 404;
      throw err;
    }

    // Validação de e-mail único (se mudou)
    if (email && email !== existing.email) {
      const emailOwner = await UserRepository.findByEmail(email);
      if (emailOwner && emailOwner.id !== id) {
        const error = new Error("Já existe um usuário com este e-mail.");
        error.statusCode = 409;
        throw error;
      }
    }

    const requesterId = requester?.id || null;
    const requesterRole = getEffectiveRequesterRole(requester);

    const normalizedRole = rawRole ? normalizeRole(rawRole) : undefined;

    // Regras de promoção/alteração de role:
    // LAB_DOCENTE não pode definir role COORDENADOR nem LAB_DOCENTE.
    if (requesterRole === "LAB_DOCENTE" && normalizedRole) {
      if (normalizedRole === "COORDENADOR" || normalizedRole === "LAB_DOCENTE") {
        const error = new Error(
          "LAB_DOCENTE não tem permissão para definir papel COORDENADOR ou LAB_DOCENTE."
        );
        error.statusCode = 403;
        throw error;
      }
    }

    // Regra de discente: se virar/continuar discente, precisa de orientador
    const targetRole = normalizedRole || existing.role;
    const targetLabBond = labBond !== undefined ? labBond : existing.labBond;
    if (isStudentRole(targetRole, targetLabBond) && !advisorId && !existing.advisorId) {
      const error = new Error("Discentes devem ter um orientador definido.");
      error.statusCode = 400;
      throw error;
    }

    const dataToUpdate = {
      ...(email !== undefined && { email }),
      ...(fullName !== undefined && { fullName }),
      ...(level !== undefined && { level }),
      ...(researchArea !== undefined && { researchArea }),
      ...(currentLink !== undefined && { currentLink }),
      ...(linkLattes !== undefined && { linkLattes }),
      ...(orcid !== undefined && { orcid }),
      ...(status !== undefined && { status }),
      ...(normalizedRole !== undefined && { role: normalizedRole }),
      ...(advisorId !== undefined && { advisorId }),
      ...(consentGiven !== undefined && { consentGiven }),
      ...(consentDate !== undefined && {
        consentDate: consentDate ? new Date(consentDate) : null,
      }),

      // Campos de vínculo e contexto acadêmico
      ...(labBond !== undefined && { labBond }),
      ...(program !== undefined && { program }),
      ...(institution !== undefined && { institution }),
      ...(unitOrDepartment !== undefined && { unitOrDepartment }),

      // LGPD / perfil público
      ...(publicProfileEnabled !== undefined && { publicProfileEnabled }),
      ...(allowPublicEmail !== undefined && { allowPublicEmail }),
      ...(allowPublicPersonalLinks !== undefined && {
        allowPublicPersonalLinks,
      }),
      ...(allowPublicAvatar !== undefined && { allowPublicAvatar }),

      // Conteúdo público extra
      ...(bio !== undefined && { bio }),
      ...(slug !== undefined && { slug }),
    };

    const updated = await UserRepository.updateById(id, dataToUpdate);

    // TODO[BD-010]: Se status / role / labBond mudarem,
    // fechar registro de UserLabBondHistory atual e criar novo.
    // if (typeof UserRepository.updateLabBondHistoryOnChange === "function") {
    //   await UserRepository.updateLabBondHistoryOnChange(existing, updated, requesterId);
    // }

    // TODO[BD-011]: AuditLog - USER_UPDATE

    return toSafeUser(updated);
  }

  /**
   * Soft delete: status = INATIVO.
   *
   * BD-015: além de alterar o status, o histórico de vínculo
   * também deve refletir a mudança (TODO).
   */
  static async inactivateUser(id, requester) {
    const existing = await UserRepository.findById(id);
    if (!existing) {
      const error = new Error("Usuário não encontrado.");
      error.statusCode = 404;
      throw error;
    }

    // [DEP. BD-003]: poderíamos impedir que o usuário inative a si mesmo etc.

    const updated = await UserRepository.inactivate(id);

    // TODO[BD-010]: Atualizar UserLabBondHistory (fechar período atual).
    // if (typeof UserRepository.closeCurrentLabBondHistory === "function") {
    //   await UserRepository.closeCurrentLabBondHistory(id, new Date(), requester?.id || null);
    // }

    // TODO[BD-011]: AuditLog - USER_INATIVATE

    return toSafeUser(updated);
  }

  // --- LEGACY (ainda usados por rotas antigas) ---

  static async getUserByRole(input) {
    const { role } = input;
    const normalizedRole = normalizeRole(role);
    const users = await UserRepository.getByRole(normalizedRole || role);
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
}
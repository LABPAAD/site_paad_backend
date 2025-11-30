import { ProjectRepository } from "../repositories/projectRepository.js";
// import { AuditService } from "./auditService.js";

/**
 * Normaliza roles legados para o modelo BD-015.
 *
 * - ADMINISTRADOR → LAB_DOCENTE
 * - DISCENTE      → USUARIO
 * - Demais valores são mantidos.
 */
function normalizeRole(role) {
  if (!role) return null;
  if (role === "ADMINISTRADOR") return "LAB_DOCENTE";
  if (role === "DISCENTE") return "USUARIO";
  return role;
}

/**
 * Verifica se o usuário logado tem permissão geral sobre projetos
 * a partir do seu papel (role efetivo).
 *
 * Regras BD-005 + BD-015:
 * - COORDENADOR → pode tudo.
 * - LAB_DOCENTE → pode atuar, mas ainda respeitando regra de "dono" do projeto.
 */
function getEffectiveRequesterRole(requester) {
  if (!requester?.role) return null;
  return normalizeRole(requester.role);
}

/**
 * Verifica se o requester pode alterar um projeto específico.
 *
 * Regra:
 * - COORDENADOR → pode qualquer projeto.
 * - Caso contrário → só se for coordenador do projeto (project.coordinatorId).
 */
function assertCanMutateProject(project, requester) {
  if (!requester) {
    const error = new Error("Usuário não autenticado.");
    error.statusCode = 401;
    throw error;
  }

  const effectiveRole = getEffectiveRequesterRole(requester);

  if (effectiveRole === "COORDENADOR") {
    return; // tem acesso total
  }

  if (requester.id && requester.id === project.coordinatorId) {
    return; // coordenador do projeto
  }

  const error = new Error(
    "Você não tem permissão para alterar este projeto."
  );
  error.statusCode = 403;
  throw error;
}

export class ProjectService {
  /**
   * Criação de projeto.
   *
   * Requisitos principais:
   * - Campos obrigatórios: title, type, startDate, coordinatorId.
   * - Deve haver pelo menos um membro na equipe (teamIds).
   * - status padrão: ATIVO (enum ProjectStatus).
   * - Conecta coordinator, team, publications, softwares.
   *
   * requesterId: id do usuário autenticado que está criando (para audit).
   */
  static async createProject(input, requesterId) {
    const {
      title,
      type,
      status,
      startDate,
      endDate,
      summary,
      funding,
      coordinatorId,
      teamIds = [],
      publicationIds = [],
      softwareIds = [],
    } = input;

    // Campos obrigatórios, alinhados ao schema
    if (!title || !type || !startDate || !coordinatorId || !summary) {
      const error = new Error(
        "Campos obrigatórios ausentes: title, type, startDate, coordinatorId, summary."
      );
      error.statusCode = 400;
      throw error;
    }

    // Regra RF24 – precisa ter pelo menos um membro na equipe
    if (!teamIds || teamIds.length === 0) {
      const error = new Error(
        "O projeto deve ter pelo menos um membro na equipe (RF24)."
      );
      error.statusCode = 400;
      throw error;
    }

    // Usa o enum do Prisma: ProjectStatus (ATIVO/ENCERRADO/INATIVO)
    const normalizedStatus = status || "ATIVO";

    const projectData = {
      title,
      type,
      status: normalizedStatus,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      summary, // agora garantidamente presente
      funding,
      coordinator: { connect: { id: coordinatorId } },
      team: { connect: teamIds.map((id) => ({ id })) },
      publications: {
        connect: publicationIds?.map((id) => ({ id })) ?? [],
      },
      softwares: {
        connect: softwareIds?.map((id) => ({ id })) ?? [],
      },
    };

    const project = await ProjectRepository.create(projectData);

    // 📜 Auditoria (BD-011) – manter como TODO / opcional
    // if (typeof AuditService?.logAction === "function") {
    //   await AuditService.logAction(requesterId, "project.create", {
    //     projectId: project.id,
    //     title: project.title,
    //     coordinatorId,
    //   });
    // }

    return project;
  }

  /**
   * Listagem de projetos com filtros opcionais.
   *
   * filters:
   * - status?: ProjectStatus
   * - type?: string
   * - coordinatorId?: string
   *
   * options:
   * - publicView?: boolean (preparado para futura lógica de LGPD, se necessário)
   */
  static async getAllProjects(filters = {}, options = {}) {
    const { publicView = false } = options;
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

    const projects = await ProjectRepository.getAll(where);

    // Se no futuro houver restrição de campos em visão pública, tratar aqui.
    if (publicView) {
      return projects;
    }

    return projects;
  }

  /**
   * Detalhe de um projeto específico.
   * options.publicView: preparado para comportamento futuro.
   */
  static async getProjectById(id, options = {}) {
    const { publicView = false } = options;

    const project = await ProjectRepository.findById(id);

    if (!project) {
      const error = new Error("Projeto não encontrado.");
      error.statusCode = 404;
      throw error;
    }

    // Futuro: se publicView === true, esconder info sensível (se existir).
    if (publicView) {
      return project;
    }

    return project;
  }

  /**
   * Atualização de projeto.
   *
   * Regras:
   * - Apenas COORDENADOR (role) OU coordenador do projeto pode atualizar.
   * - Permite atualização de campos simples e relacionais:
   *   - title, type, status, startDate, endDate, summary, funding.
   *   - coordinatorId (troca coord.) – ainda sob regra de permissão.
   *   - teamIds, publicationIds, softwareIds via set/connect.
   */
  static async updateProject(id, input, requester) {
    const {
      title,
      type,
      status,
      startDate,
      endDate,
      summary,
      funding,
      coordinatorId,
      teamIds,
      publicationIds,
      softwareIds,
    } = input;

    const existing = await ProjectRepository.findById(id);

    if (!existing) {
      const error = new Error("Projeto não encontrado.");
      error.statusCode = 404;
      throw error;
    }

    // Verifica se requester pode alterar este projeto
    assertCanMutateProject(existing, requester);

    const dataToUpdate = {
      ...(title !== undefined && { title }),
      ...(type !== undefined && { type }),
      ...(status !== undefined && { status }),
      ...(startDate !== undefined && {
        startDate: startDate ? new Date(startDate) : existing.startDate,
      }),
      ...(endDate !== undefined && {
        endDate: endDate ? new Date(endDate) : null,
      }),
      ...(summary !== undefined && { summary }),
      ...(funding !== undefined && { funding }),
    };

    // Troca de coordenador (se enviado)
    if (coordinatorId !== undefined) {
      dataToUpdate.coordinator = { connect: { id: coordinatorId } };
    }

    // Atualização de equipe
    if (Array.isArray(teamIds)) {
      dataToUpdate.team = {
        set: teamIds.map((id) => ({ id })),
      };
    }

    // Atualização de publicações associadas
    if (Array.isArray(publicationIds)) {
      dataToUpdate.publications = {
        set: publicationIds.map((id) => ({ id })),
      };
    }

    // Atualização de softwares associados
    if (Array.isArray(softwareIds)) {
      dataToUpdate.softwares = {
        set: softwareIds.map((id) => ({ id })),
      };
    }

    const updated = await ProjectRepository.update(id, dataToUpdate);

    // TODO[BD-010]: Registrar antes/depois em ProjectHistory
    // if (typeof ProjectRepository.logHistory === "function") {
    //   await ProjectRepository.logHistory(existing, updated, requester.id);
    // }

    // TODO[BD-011]: AuditLog - PROJECT_UPDATE
    // if (typeof AuditService?.logAction === "function") {
    //   await AuditService.logAction(requester.id, "project.update", {
    //     projectId: updated.id,
    //   });
    // }

    return updated;
  }

  /**
   * Soft delete de projeto: status = INATIVO.
   *
   * Regras:
   * - Apenas COORDENADOR (role) ou coordenador do projeto.
   */
  static async inactivateProject(id, requester) {
    const existing = await ProjectRepository.findById(id);

    if (!existing) {
      const error = new Error("Projeto não encontrado.");
      error.statusCode = 404;
      throw error;
    }

    // Verifica permissão
    assertCanMutateProject(existing, requester);

    const updated = await ProjectRepository.update(id, {
      status: "INATIVO",
    });

    // TODO[BD-010]: Registrar mudança em ProjectHistory
    // if (typeof ProjectRepository.logHistory === "function") {
    //   await ProjectRepository.logHistory(existing, updated, requester.id);
    // }

    // TODO[BD-011]: AuditLog - PROJECT_INACTIVATE
    // if (typeof AuditService?.logAction === "function") {
    //   await AuditService.logAction(requester.id, "project.inactivate", {
    //     projectId: updated.id,
    //   });
    // }

    return updated;
  }
}
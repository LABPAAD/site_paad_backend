import { ProjectRepository } from '../repositories/projectRepository.js';
// import { AuditService } from './auditService.js';

export class ProjectService {
  static async createProject(input, requesterId) {
    const {
      title,
      type,
      status = 'ativo',
      startDate,
      endDate,
      summary,
      funding,
      coordinatorId,
      teamIds = [],
      publicationIds = [],
      softwareIds = []
    } = input;

    if (!title || !type || !startDate || !coordinatorId) {
      throw new Error('Campos obrigatórios ausentes: title, type, startDate, coordinatorId.');
    }

    if (!teamIds || teamIds.length === 0) {
      throw new Error('O projeto deve ter pelo menos um discente na equipe (RF24).');
    }

    const projectData = {
      title,
      type,
      status,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      summary,
      funding,
      coordinator: { connect: { id: coordinatorId } },
      team: { connect: teamIds.map(id => ({ id })) },
      publications: { connect: publicationIds?.map(id => ({ id })) ?? [] },
      softwares: { connect: softwareIds?.map(id => ({ id })) ?? [] }
    };

    const project = await ProjectRepository.create(projectData);

    // 📜 Auditoria (RF10, RF62)
    // await AuditService.logAction(requesterId, 'project.create', {
    //   projectId: project.id,
    //   title: project.title,
    //   coordinatorId
    // });

    return project;
  }

  static async getAllProjects() {
    const projects = await ProjectRepository.getAll();

    return projects;
  }

  static async updateProject(id, data) {
    const project = await ProjectRepository.update(id, data);

    return project;
  }
}
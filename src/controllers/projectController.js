import { ProjectService } from '../service/projectService.js';

/**
 * POST /api/projects/
 * Criação de projeto (restrito a COORDENADOR e LAB_DOCENTE).
 */
export const createProject = async (req, res) => {
  try {
    const requester = req.user; // já validado via requireAuth + requireRole

    const project = await ProjectService.createProject(req.body, requester.id);

    return res.status(201).json(project);
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Erro ao criar projeto.';
    return res.status(statusCode).json({ message });
  }
};

/**
 * GET /api/projects/
 * Endpoint público — lista projetos com filtros opcionais.
 *
 * Filtros suportados:
 *   - ?status=ATIVO|ENCERRADO|INATIVO
 *   - ?type=<tipo de projeto>
 *   - ?coordinatorId=<id do coordenador>
 */
export const getAllProjects = async (req, res) => {
  try {
    const { status, type, coordinatorId } = req.query;

    const requester = req.user || null;
    const publicView = !requester;

    const projects = await ProjectService.getAllProjects(
      {
        status,
        type,
        coordinatorId,
      },
      { publicView }
    );

    return res.status(200).json(projects);
  } catch (error) {
    console.error('Erro ao listar projetos:', error);
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Erro ao buscar projetos.';
    return res.status(statusCode).json({ message });
  }
};

/**
 * GET /api/projects/:id
 * Endpoint público — detalhes de um projeto.
 */
export const getProjectById = async (req, res) => {
  try {
    const requester = req.user || null;
    const publicView = !requester;

    const project = await ProjectService.getProjectById(req.params.id, {
      publicView,
    });

    return res.status(200).json(project);
  } catch (error) {
    console.error('Erro ao buscar projeto:', error);
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Erro ao buscar projeto.';
    return res.status(statusCode).json({ message });
  }
};

/**
 * PUT /api/projects/:id
 * Atualização de projeto.
 *
 * Regras de negócio (implementadas no service):
 *   - Apenas COORDENADOR ou LAB_DOCENTE (validados via requireRole).
 *   - Além disso, somente:
 *       * COORDENADOR, ou
 *       * o próprio coordenador do projeto (project.coordinatorId === req.user.id)
 *     pode editar.
 */
export const updateProject = async (req, res) => {
  try {
    const requester = req.user; // já autenticado

    const updated = await ProjectService.updateProject(
      req.params.id,
      req.body,
      requester
    );

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Erro ao atualizar projeto.';
    return res.status(statusCode).json({ message });
  }
};

/**
 * DELETE /api/projects/:id
 * Soft delete de projeto — status = INATIVO.
 *
 * Regras de negócio (implementadas no service):
 *   - Apenas COORDENADOR ou LAB_DOCENTE (validados via requireRole).
 *   - Além disso, somente:
 *       * COORDENADOR, ou
 *       * o próprio coordenador do projeto
 *     pode desativar.
 */
export const inactivateProject = async (req, res) => {
  try {
    const requester = req.user; // já autenticado

    const updated = await ProjectService.inactivateProject(
      req.params.id,
      requester
    );

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Erro ao desativar projeto:', error);
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Erro ao desativar projeto.';
    return res.status(statusCode).json({ message });
  }
};
import { ProjectService } from '../service/projectService.js';

export const createProject = async (req, res) => {
  try {
    // const requesterId = req.user.id;
    const project = await ProjectService.createProject(req.body, 'idwbiduwieuiwed');
    res.status(201).json(project);
  } catch (error) {
    // console.error('Erro ao criar projeto:', error);
    res.status(400).json({ error: error.message });
  }
}

export const getAllProjects = async (req, res) => {
    try {
        const projects = await ProjectService.getAllProjects();
        res.status(200).json(projects);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export const updateProject = async (req, res) => {
    try {
        const id = req.params.id;
        const projects = await ProjectService.updateProject(id, req.body);
        res.status(200).json(projects);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}
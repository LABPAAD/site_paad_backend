import { UserService } from "../service/userService.js";

export const createUser = async (req, res) => {
  try {
    const requester = req.user || null;

    const user = await UserService.create(req.body, requester);

    return res.status(201).json(user);
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Erro ao criar usuário.';
    return res.status(statusCode).json({ message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { role, status, advisorId } = req.query;

    const users = await UserService.getAllUsers({
      role,
      status,
      advisorId,
    });

    return res.json(users);
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Erro ao buscar usuários.';
    return res.status(statusCode).json({ message });
  }
};

/**
 * GET /api/user/:id
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserService.getById(id);
    return res.json(user);
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Erro ao buscar usuário.';
    return res.status(statusCode).json({ message });
  }
};

/**
 * PUT /api/user/:id
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const requester = req.user || null;

    const user = await UserService.updateUser(id, req.body, requester);

    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Erro ao atualizar usuário.';
    return res.status(statusCode).json({ message });
  }
};

/**
 * DELETE /api/user/:id  (soft delete)
 */
export const inactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const requester = req.user || null;

    const user = await UserService.inactivateUser(id, requester);

    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Erro ao desativar usuário.';
    return res.status(statusCode).json({ message });
  }
};

// --- LEGACY (rotas antigas) ---

export const getUserByRole = async (req, res) => {
  try {
    const user = await UserService.getUserByRole(req.body);
    return res.json(user);
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Erro ao buscar usuários por role.';
    return res.status(statusCode).json({ message });
  }
};

export const getUserByAdvisor = async (req, res) => {
  try {
    const user = await UserService.getByAdvsiorId(req.body);
    return res.json(user);
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Erro ao buscar usuários por orientador.';
    return res.status(statusCode).json({ message });
  }
};

export const updateData = async (req, res) => {
  try {
    const updatedData = await UserService.updateData(req.body);
    return res.status(200).json(updatedData);
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Erro ao atualizar dados do usuário.';
    return res.status(statusCode).json({ message });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const updatedData = await UserService.updateData(req.body);
    return res.status(200).json(updatedData);
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Erro ao atualizar status do usuário.';
    return res.status(statusCode).json({ message });
  }
}; 

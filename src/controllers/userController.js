import { UserService } from "../service/userService.js";

/**
 * POST /api/user/
 * Criação de usuário (Pessoa).
 * Requer autenticação e será filtrado por role via RBAC na rota.
 */
export const createUser = async (req, res) => {
  try {
    const requester = req.user || null;

    const user = await UserService.create(req.body, requester);

    return res.status(201).json(user);
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    const message = error.message || "Erro ao criar usuário.";
    return res.status(statusCode).json({ message });
  }
};

/**
 * GET /api/user/
 * Listagem de usuários com filtros.
 * Pode ser usado em contexto público (sem req.user) ou interno (com req.user).
 * Em contexto público, pode aplicar filtro de LGPD (consentGiven) via service.
 */
export const getAllUsers = async (req, res) => {
  try {
    const {
      role,
      status,
      advisorId,
      labBond,
      q,
    } = req.query;

    const requester = req.user || null;
    const publicView = !requester; // se não tiver usuário autenticado, tratamos como visão pública

    const users = await UserService.getAllUsers(
      {
        role,
        status,
        advisorId,
        labBond,
        q,
      },
      {
        publicView,
      }
    );

    return res.json(users);
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    const message = error.message || "Erro ao buscar usuários.";
    return res.status(statusCode).json({ message });
  }
};

/**
 * GET /api/user/:id
 * Detalhe de um usuário específico.
 * Em contexto público, pode aplicar filtro de LGPD (consentGiven) via service.
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const requester = req.user || null;
    const publicView = !requester;

    const user = await UserService.getById(id, { publicView });

    return res.json(user);
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    const message = error.message || "Erro ao buscar usuário.";
    return res.status(statusCode).json({ message });
  }
};

/**
 * PUT /api/user/:id
 * Atualização de dados de um usuário.
 * Requer autenticação e será filtrado por role via RBAC na rota.
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
    const message = error.message || "Erro ao atualizar usuário.";
    return res.status(statusCode).json({ message });
  }
};

/**
 * DELETE /api/user/:id
 * Soft delete (status = INATIVO).
 * Requer autenticação e permissão adequada.
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
    const message = error.message || "Erro ao desativar usuário.";
    return res.status(statusCode).json({ message });
  }
};

// --- LEGACY (rotas antigas, mantidas por compatibilidade) ---

export const getUserByRole = async (req, res) => {
  try {
    const user = await UserService.getUserByRole(req.body);
    return res.json(user);
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    const message =
      error.message || "Erro ao buscar usuários por role.";
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
    const message =
      error.message || "Erro ao buscar usuários por orientador.";
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
    const message =
      error.message || "Erro ao atualizar dados do usuário.";
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
    const message =
      error.message || "Erro ao atualizar status do usuário.";
    return res.status(statusCode).json({ message });
  }
};
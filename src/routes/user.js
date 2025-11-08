import { Router } from 'express';
import { createUser, getUserByRole, getAllUsers, getUserByAdvisor } from '../controllers/userController.js';

const router = Router();

router.post("/cadastrar-aluno", createUser);
router.get("/buscar", getAllUsers);
router.get("/buscar-role", getUserByRole);
router.get("/buscar-por-orientador", getUserByAdvisor);

export default router;
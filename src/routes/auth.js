import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res, next) =>
  AuthController.login(req, res, next)
);

// POST /api/auth/logout
router.post('/logout', (req, res, next) =>
  AuthController.logout(req, res, next)
);

// POST /api/auth/forgot-password
router.post('/forgot-password', (req, res, next) =>
  AuthController.forgotPassword(req, res, next)
);

// POST /api/auth/reset-password
router.post('/reset-password', (req, res, next) =>
  AuthController.resetPassword(req, res, next)
);

export default router;

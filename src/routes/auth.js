import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Login / Logout / Recuperação de senha
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

// retorna usuário autenticado
router.get('/me', requireAuth, AuthController.me);

// 2FA - protegido (usuário logado)
router.post('/2fa/generate', requireAuth, AuthController.generate2FA);
router.post('/2fa/verify-enable', requireAuth, AuthController.verifyEnable2FA);
router.post('/2fa/disable', requireAuth, AuthController.disable2FA);

// 2FA - verificação de login (público, após {"2fa_required": true})
router.post('/2fa/login-verify', AuthController.verify2FALogin);

export default router; 

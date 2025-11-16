// src/controllers/authController.js
import { AuthService } from '../service/authService.js';

const getCookieName = () => process.env.COOKIE_NAME || 'paad_session';
const isCookieSecure = () => process.env.COOKIE_SECURE === 'true';

export class AuthController {
  static async login(req, res, next) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
        return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
        }

        const requestMetadata = {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        };

        const result = await AuthService.login(email, password, requestMetadata);

        // Se 2FA estiver habilitado (dependência BD-002)
        if (result.twoFactorRequired) {
        return res.status(200).json({ "2fa_required": true });
        }

        const { token, user } = result;

        const cookieName = getCookieName();

        res.cookie(cookieName, token, {
        httpOnly: true,
        secure: isCookieSecure(),
        sameSite: 'lax',
        });

        return res.status(200).json({ user });
    } catch (error) {
        console.error(error);

        const statusCode = error.statusCode || 500;
        const message = error.message || 'Erro interno no servidor.';

        return res.status(statusCode).json({ message });
    }
  }

  static async logout(req, res, next) {
    try {
      // Se no futuro houver blacklist, podemos passar o token atual para o service
      // ex: const token = req.cookies[getCookieName()];
      await AuthService.logout();

      res.clearCookie(getCookieName());

      return res.status(200).json({
        message: 'Logout realizado com sucesso.',
      });
    } catch (error) {
      return next(error);
    }
  }

  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'E-mail é obrigatório.' });
      }

      const requestMetadata = {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      };

      await AuthService.forgotPassword(email, requestMetadata);

      // Mensagem genérica para não revelar se o e-mail existe ou não
      return res.status(200).json({
        message: 'Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.',
      });
    } catch (error) {
      return next(error);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token e nova senha são obrigatórios.' });
      }

      const requestMetadata = {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      };

      await AuthService.resetPassword(token, newPassword, requestMetadata);

      return res.status(200).json({
        message: 'Senha redefinida com sucesso.',
      });
    } catch (error) {
      return next(error);
    }
  }
}

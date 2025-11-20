import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';

const getCookieName = () => process.env.COOKIE_NAME || 'paad_session';

export async function requireAuth(req, res, next) {
  try {
    const cookieName = getCookieName();

    // 1) Tenta pegar o token do cookie (fluxo normal do frontend)
    let token = req.cookies?.[cookieName];

    // 2) Fallback: Authorization: Bearer <token> (útil pra Insomnia/Postman)
    if (!token) {
      const authHeader = req.headers.authorization || '';
      const [scheme, value] = authHeader.split(' ');
      if (scheme === 'Bearer' && value) {
        token = value;
      }
    }

    if (!token) {
      const err = new Error('Não autenticado.');
      err.statusCode = 401;
      throw err;
    }

    // 3) Valida o JWT
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      const err = new Error('Token inválido ou expirado.');
      err.statusCode = 401;
      throw err;
    }

    // payload.sub deve ser o ID do usuário
    const userId = payload.sub;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'ATIVO') {
      const err = new Error('Usuário não encontrado ou inativo.');
      err.statusCode = 401;
      throw err;
    }

    // Monta um objeto "seguro" para req.user (sem senha, sem segredos)
    const { id, email, fullName, role, status, twoFactorEnabled } = user;

    req.user = {
      id,
      email,
      fullName,
      role,
      status,
      twoFactorEnabled,
    };

    // TODO[BD-011]: Registrar falhas 401 no AuditLog, se necessário

    return next();
  } catch (error) {
    console.error('[requireAuth] erro:', error);
    const statusCode = error.statusCode || 401;
    const message = error.message || 'Não autenticado.';
    return res.status(statusCode).json({ message });
  }
}
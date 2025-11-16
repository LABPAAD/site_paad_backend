import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';

const getCookieName = () => process.env.COOKIE_NAME || 'paad_session';

export async function requireAuth(req, res, next) {
  try {
    const cookieName = getCookieName();

    // 1) Tenta pegar do cookie
    let token = req.cookies?.[cookieName];

    // 2) Fallback: tenta pegar do header Authorization: Bearer <token>
    if (!token) {
      const authHeader = req.headers['authorization'] || req.headers['Authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7); // remove "Bearer "
      }
    }

    if (!token) {
      // TODO[BD-011]: Registrar acesso não autenticado no AuditLog (401)
      return res.status(401).json({ message: 'Não autenticado.' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // TODO[BD-011]: Registrar token inválido/expirado no AuditLog (401)
      return res.status(401).json({ message: 'Sessão inválida ou expirada.' });
    }

    const userId = payload.sub;

    if (!userId) {
      return res.status(401).json({ message: 'Sessão inválida.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'ATIVO') {
      // TODO[BD-011]: Registrar acesso com usuário inexistente/inativo (401)
      return res.status(401).json({ message: 'Usuário não autorizado.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      fullName: user.fullName,
    };

    return next();
  } catch (error) {
    console.error('[requireAuth] Erro inesperado:', error);
    return res.status(500).json({ message: 'Erro interno de autenticação.' });
  }
}

/**
 * Factory de middleware de autorização baseada em papéis.
 * Exemplo de uso:
 *   router.post('/alguma-rota',
 *     requireAuth,
 *     requireRole(['COORDENADOR', 'ADMINISTRADOR']),
 *     controllerHandler
 *   );
 */
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        // Se chegou aqui sem req.user, o requireAuth não foi aplicado corretamente
        return res.status(401).json({ message: 'Não autenticado.' });
      }

      const { role } = req.user;

      if (!allowedRoles.includes(role)) {
        // TODO[BD-011]: Registrar tentativa de acesso não autorizado (403) no AuditLog
        return res.status(403).json({ message: 'Acesso negado.' });
      }

      return next();
    } catch (error) {
      console.error('[requireRole] Erro inesperado:', error);
      return res.status(500).json({ message: 'Erro interno de autorização.' });
    }
  };
}

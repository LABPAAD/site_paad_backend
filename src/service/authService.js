import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRepository } from '../repositories/userRepository.js';
import { prisma } from '../config/db.js';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';

// Controle simples em memória para brute force (sem mexer no schema)
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 15;
const loginAttemptsStore = new Map(); // key: userId or email

function getLoginAttemptKey(email) {
  // Como ainda não persistimos isso no BD, vamos usar o e-mail como chave
  return `login_${email}`;
}

function isLocked(key) {
  const entry = loginAttemptsStore.get(key);
  if (!entry) return false;

  const now = new Date();
  if (entry.lockUntil && entry.lockUntil > now) {
    return true;
  }

  // Se já passou o tempo, limpa registro
  if (entry.lockUntil && entry.lockUntil <= now) {
    loginAttemptsStore.delete(key);
  }

  return false;
}

function registerFailedAttempt(key) {
  const now = new Date();
  const current = loginAttemptsStore.get(key) || { attempts: 0, lockUntil: null };
  const attempts = current.attempts + 1;

  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    const lockUntil = new Date(now.getTime() + LOCK_TIME_MINUTES * 60 * 1000);
    loginAttemptsStore.set(key, { attempts, lockUntil });
  } else {
    loginAttemptsStore.set(key, { attempts, lockUntil: null });
  }
}

function resetAttempts(key) {
  loginAttemptsStore.delete(key);
}

export class AuthService {
  static async login(email, password, requestMetadata = {}) {
    const attemptKey = getLoginAttemptKey(email);

    // Verifica se o e-mail está temporariamente bloqueado
    if (isLocked(attemptKey)) {
      // TODO[BD-011]: Registrar tentativa bloqueada no AuditLog via AuditService
      // await AuditService.logLoginAttempt({ email, success: false, reason: 'locked', ...requestMetadata });

      const error = new Error('Muitas tentativas de login. Tente novamente em alguns minutos.');
      error.statusCode = 429;
      throw error;
    }

    const user = await UserRepository.findByEmail(email);

    if (!user || user.status !== 'ATIVO' || !user.password) {
      // Registra tentativa falha (usuário inexistente/inativo)
      registerFailedAttempt(attemptKey);

      // TODO[BD-011]: Registrar tentativa de login falha no AuditLog
      // await AuditService.logLoginAttempt({ userId: user?.id, email, success: false, ...requestMetadata });

      const error = new Error('Credenciais inválidas.');
      error.statusCode = 401;
      throw error;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      registerFailedAttempt(attemptKey);

      // TODO[BD-011]: Registrar tentativa de login falha no AuditLog
      // await AuditService.logLoginAttempt({ userId: user.id, email, success: false, ...requestMetadata });

      const error = new Error('Credenciais inválidas.');
      error.statusCode = 401;
      throw error;
    }

    // Login bem-sucedido → reseta tentativas
    resetAttempts(attemptKey);

    // TODO[BD-011]: Registrar login bem-sucedido no AuditLog
    // await AuditService.logLoginAttempt({ userId: user.id, email, success: true, ...requestMetadata });

    // Verificar se 2FA está habilitado
    if (user.twoFactorEnabled) {
      return {
        twoFactorRequired: true,
        userId: user.id,
        email: user.email,
      };
    }

    // Gera JWT de sessão
    const tokenPayload = {
      sub: user.id,
      role: user.role,
      // TODO[RF02]: podemos incluir claims extras para controle de inatividade se usarmos store server-side
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      },
    );

    // Retorna token + dados básicos do usuário (sem senha)
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
      },
    };
  }

  static async logout(/*userIdOrToken*/) {
    // Como estamos usando JWT "stateless", o logout básico só limpa o cookie no controller.
    // Caso no futuro seja necessário blacklist de tokens:
    // TODO[RF02]: Implementar blacklist ou store de sessões para expiração por inatividade.
    return { success: true };
  }

  static async forgotPassword(email, requestMetadata = {}) {
    const user = await UserRepository.findByEmail(email);

    // Por segurança, não revelamos se usuário existe ou não.
    // Se não existir ou não estiver ATIVO, apenas retornamos sucesso silencioso.
    if (!user || user.status !== 'ATIVO') {
      // Opcional: AuditLog aqui
      // TODO[BD-011]: Registrar tentativa de recuperação de senha para e-mail inexistente/inativo.
      return { success: true };
    }

    // Gera token bruto
    const resetToken = crypto.randomBytes(32).toString('hex');
    console.log('[DEV] Password reset token (plaintext):', resetToken);

    // Cria hash do token pra salvar no BD
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

    // Atualiza usuário com hash e expiração
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: expires,
      },
    });

    // Monta link de reset (será usado pelo serviço de e-mail)
    // Em task futura (BD-008), provavelmente usaremos uma variável FRONTEND_URL
    const resetLinkPlaceholder = `https://frontend-url/reset-password?token=${resetToken}`;

    // TODO[BD-008]: Integrar com serviço de envio de e-mail
    // await EmailService.sendPasswordResetEmail({
    //   to: user.email,
    //   name: user.fullName,
    //   resetLink: resetLinkPlaceholder,
    // });

    // TODO[BD-011]: Registrar solicitação de reset de senha no AuditLog
    // await AuditService.logPasswordResetRequest({ userId: user.id, ...requestMetadata });

    return { success: true };
  }

  static async resetPassword(token, newPassword, requestMetadata = {}) {
    // Gera o hash do token recebido para comparar com o BD
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const now = new Date();

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: {
          gt: now,
        },
      },
    });

    if (!user) {
      const error = new Error('Token de redefinição inválido ou expirado.');
      error.statusCode = 400;
      throw error;
    }

    // Gera hash da nova senha
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Atualiza senha e invalida token de reset
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // TODO[BD-011]: Registrar troca de senha no AuditLog
    // await AuditService.logPasswordChange({ userId: user.id, ...requestMetadata });

    return { success: true };
  }


  static async generateTwoFactorSecret(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'ATIVO') {
      const error = new Error('Usuário não encontrado ou inativo.');
      error.statusCode = 404;
      throw error;
    }

    // Gera segredo TOTP
    const secret = authenticator.generateSecret();

    // Gera otpauth:// URL para app autenticador
    const issuer = 'PAAD UFPI';
    const label = user.email; // pode customizar, ex: PAAD (${user.email})
    const otpauthUrl = authenticator.keyuri(label, issuer, secret);

    // Salva segredo no banco, mas NÃO habilita o 2FA ainda
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: secret,
        twoFactorEnabled: false,
      },
    });

    // Gera QR Code em data URL para o frontend exibir
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    return {
      otpauthUrl,
      qrCodeDataUrl,
    };
  }


static async verifyAndEnableTwoFactor(userId, code, requestMetadata = {}) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'ATIVO') {
      const error = new Error('Usuário não encontrado ou inativo.');
      error.statusCode = 404;
      throw error;
    }

    if (!user.twoFactorSecret) {
      const error = new Error('2FA não foi iniciado para este usuário.');
      error.statusCode = 400;
      throw error;
    }

    const isValid = authenticator.check(code, user.twoFactorSecret);

    if (!isValid) {
      const error = new Error('Código 2FA inválido.');
      error.statusCode = 400;
      throw error;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
      },
    });

    // TODO[BD-011]: Registrar ativação de 2FA no AuditLog
    // await AuditService.logTwoFactorEnabled({ userId: user.id, ...requestMetadata });

    // Opcional: gerar códigos de backup no futuro
    return { success: true };
  }



static async verifyTwoFactorLogin(email, code, requestMetadata = {}) {
    const user = await UserRepository.findByEmail(email);

    if (!user || user.status !== 'ATIVO' || !user.twoFactorEnabled || !user.twoFactorSecret) {
      const error = new Error('Usuário não autorizado para login com 2FA.');
      error.statusCode = 401;
      throw error;
    }

    const isValid = authenticator.check(code, user.twoFactorSecret);

    if (!isValid) {
      const error = new Error('Código 2FA inválido.');
      error.statusCode = 400;
      throw error;
    }

    // TODO[BD-011]: Registrar login com 2FA no AuditLog
    // await AuditService.logTwoFactorLogin({ userId: user.id, email: user.email, ...requestMetadata });

    const tokenPayload = {
      sub: user.id,
      role: user.role,
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      },
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
      },
    };
  }



static async disableTwoFactor(userId, { currentPassword, code } = {}, requestMetadata = {}) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'ATIVO') {
      const error = new Error('Usuário não encontrado ou inativo.');
      error.statusCode = 404;
      throw error;
    }

    // 2FA obrigatório para Coordenador e Administrador
    if (['COORDENADOR', 'ADMINISTRADOR'].includes(user.role)) {
      const error = new Error('2FA é obrigatório para este perfil e não pode ser desativado.');
      error.statusCode = 400;
      throw error;
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      const error = new Error('2FA não está habilitado para este usuário.');
      error.statusCode = 400;
      throw error;
    }

    if (!currentPassword && !code) {
      const error = new Error('É necessário informar a senha atual ou um código 2FA para desativar o 2FA.');
      error.statusCode = 400;
      throw error;
    }

    let verified = false;

    // Verifica senha, se fornecida
    if (currentPassword && user.password) {
      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      if (passwordMatch) {
        verified = true;
      }
    }

    // Se ainda não foi verificado por senha, tenta verificar por código 2FA
    if (!verified && code) {
      const isValidCode = authenticator.check(code, user.twoFactorSecret);
      if (isValidCode) {
        verified = true;
      }
    }

    if (!verified) {
      const error = new Error('Credenciais inválidas para desativar o 2FA.');
      error.statusCode = 400;
      throw error;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    // TODO[BD-011]: Registrar desativação de 2FA no AuditLog
    // await AuditService.logTwoFactorDisabled({ userId: user.id, ...requestMetadata });

    return { success: true };
  }
}
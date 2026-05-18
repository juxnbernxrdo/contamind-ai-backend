import { Injectable, BadRequestException, UnauthorizedException, Inject } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthAuditService } from './auth-audit.service';
import { AuthSessionService } from './auth-session.service';
import { EncryptionUtil } from './utils/encryption.util';

@Injectable()
export class Auth2FAService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuthAuditService,
    private readonly sessionService: AuthSessionService,
    private readonly encryptionUtil: EncryptionUtil,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  // ── SETUP ──────────────────────────────────────────────────────────────────

  async generateSetup(userId: string): Promise<{
    secret: string;
    otpauthUrl: string;
    qrCodeDataUrl: string;
    backupCodes: string[];
  }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    
    if (user.twoFAEnabled) {
      throw new BadRequestException('2FA is already enabled. Disable it first before setting it up again.');
    }
    
    const secret = authenticator.generateSecret(32);
    const otpauthUrl = authenticator.keyuri(user.email, 'ContaMind', secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    const backupCodes = this.generateBackupCodes(10);
    
    // ENCRYPT secret before temporary storage
    const encrypted = this.encryptionUtil.encrypt(secret);
    
    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        totpSecret: encrypted.ciphertext,
        totpIv: encrypted.iv,
        totpAuthTag: encrypted.authTag,
      }
    });

    return { secret, otpauthUrl, qrCodeDataUrl, backupCodes };
  }

  async activateTotp(userId: string, token: string): Promise<{ backupCodes: string[] }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    
    if (!user.totpSecret || !user.totpIv || !user.totpAuthTag) {
      throw new BadRequestException('2FA setup not initiated. Call /auth/2fa/setup first.');
    }

    // DECRYPT for verification
    const secret = this.encryptionUtil.decrypt(user.totpSecret, user.totpIv, user.totpAuthTag);

    if (!authenticator.verify({ token, secret })) {
      throw new UnauthorizedException('Invalid TOTP token. Check your authenticator app.');
    }

    const backupCodes = this.generateBackupCodes(10);
    const hashedCodes = backupCodes.map(code => this.hashBackupCode(code));

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFAEnabled: true,
        backupCodes: hashedCodes,
        securityVersion: { increment: 1 },
      }
    });

    await this.sessionService.revokeAllSessions(userId);

    return { backupCodes };
  }

  // ── VERIFICACIÓN ───────────────────────────────────────────────────────────

  async verifyTotp(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    
    if (!user.twoFAEnabled || !user.totpSecret || !user.totpIv || !user.totpAuthTag) {
      throw new BadRequestException('2FA is not enabled for this user.');
    }

    const usedKey = `totp_used:${userId}:${token}`;
    
    // FAIL-CLOSED for replay protection
    try {
      const isUsed = await this.redis.get(usedKey);
      if (isUsed) {
        throw new UnauthorizedException('TOTP token already used (replay detected).');
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      // If Redis is down, we must block privileged MFA verification to be safe
      throw new InternalServerErrorException('Security verification service unavailable');
    }

    const secret = this.encryptionUtil.decrypt(user.totpSecret, user.totpIv, user.totpAuthTag);

    // Verificar con ventana de ±1 período (30s) para tolerar desincronización de reloj
    authenticator.options = { window: 1 };
    const isValid = authenticator.verify({ token, secret });
    
    if (isValid) {
      // Marcar como usado por 60s (cubre la ventana actual y ±1)
      try {
        await this.redis.set(usedKey, '1', 'EX', 60);
      } catch (err) {
        // P1 — Enforce strict fail-closed Redis writes
        console.error('CRITICAL: Redis error while marking TOTP as used:', err);
        throw new InternalServerErrorException('Security persistence failure. Action blocked.');
      }
    }
    
    return isValid;
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const normalizedCode = code.replace(/\s/g, '').toUpperCase();
    const hashed = this.hashBackupCode(normalizedCode);

    const index = user.backupCodes.indexOf(hashed);
    if (index === -1) return false;

    // Código válido — consumirlo (one-time use)
    const updatedCodes = [...user.backupCodes];
    updatedCodes.splice(index, 1);

    await this.prisma.user.update({
      where: { id: userId },
      data: { backupCodes: updatedCodes }
    });

    return true;
  }

  // ── DESACTIVACIÓN ──────────────────────────────────────────────────────────

  async disable2FA(userId: string, token: string, context: any): Promise<void> {
    const isValid = await this.verifyTotp(userId, token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid TOTP token. Cannot disable 2FA.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFAEnabled: false,
        totpSecret: null,
        totpIv: null,
        totpAuthTag: null,
        backupCodes: [],
        securityVersion: { increment: 1 },
      }
    });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.audit.log(user.tenantId, userId, '2fa_disabled', context, 'success');
  }

  async regenerateBackupCodes(userId: string, token: string): Promise<string[]> {
    const isValid = await this.verifyTotp(userId, token);
    if (!isValid) throw new UnauthorizedException('Invalid TOTP token.');

    const newCodes = this.generateBackupCodes(10);
    const hashed = newCodes.map(c => this.hashBackupCode(c));

    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        backupCodes: hashed,
        securityVersion: { increment: 1 },
      }
    });

    return newCodes; // Retornar en texto plano UNA sola vez al usuario
  }

  // ── HELPERS ────────────────────────────────────────────────────────────────

  private generateBackupCodes(count: number): string[] {
    return Array.from({ length: count }, () => {
      const raw = crypto.randomBytes(5).toString('hex').toUpperCase();
      return `${raw.slice(0, 5)}-${raw.slice(5)}`; // formato: ABCDE-F1234
    });
  }

  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
  }
}

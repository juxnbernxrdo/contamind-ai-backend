import { Injectable, BadRequestException, UnauthorizedException, Inject } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthAuditService } from './auth-audit.service';
import { AuthSessionService } from './auth-session.service';

@Injectable()
export class Auth2FAService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuthAuditService,
    private readonly sessionService: AuthSessionService,
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
    
    // Guardar secreto temporal (no activado aún, se activa al verificar)
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: secret } // twoFAEnabled permanece false hasta verify
    });

    return { secret, otpauthUrl, qrCodeDataUrl, backupCodes };
  }

  async activateTotp(userId: string, token: string): Promise<{ backupCodes: string[] }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    
    if (!user.totpSecret) {
      throw new BadRequestException('2FA setup not initiated. Call /auth/2fa/setup first.');
    }

    if (!authenticator.verify({ token, secret: user.totpSecret })) {
      throw new UnauthorizedException('Invalid TOTP token. Check your authenticator app.');
    }

    const backupCodes = this.generateBackupCodes(10);
    const hashedCodes = backupCodes.map(code => this.hashBackupCode(code));

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFAEnabled: true,
        backupCodes: hashedCodes,
      }
    });

    await this.sessionService.revokeAllSessions(userId);

    return { backupCodes };
  }

  // ── VERIFICACIÓN ───────────────────────────────────────────────────────────

  async verifyTotp(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    
    if (!user.twoFAEnabled || !user.totpSecret) {
      throw new BadRequestException('2FA is not enabled for this user.');
    }

    const usedKey = `totp_used:${userId}:${token}`;
    const isUsed = await this.redis.get(usedKey);
    if (isUsed) {
      throw new UnauthorizedException('TOTP token already used (replay detected).');
    }

    // Verificar con ventana de ±1 período (30s) para tolerar desincronización de reloj
    authenticator.options = { window: 1 };
    const isValid = authenticator.verify({ token, secret: user.totpSecret });
    
    if (isValid) {
      // Marcar como usado por 60s (cubre la ventana actual y ±1)
      await this.redis.set(usedKey, '1', 'EX', 60);
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
        backupCodes: [],
      }
    });

    await this.audit.log(
      (await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })).tenantId,
      userId, '2fa_disabled', context, 'success'
    );
  }

  async regenerateBackupCodes(userId: string, token: string): Promise<string[]> {
    const isValid = await this.verifyTotp(userId, token);
    if (!isValid) throw new UnauthorizedException('Invalid TOTP token.');

    const newCodes = this.generateBackupCodes(10);
    const hashed = newCodes.map(c => this.hashBackupCode(c));

    await this.prisma.user.update({
      where: { id: userId },
      data: { backupCodes: hashed }
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

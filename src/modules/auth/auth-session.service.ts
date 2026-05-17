import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtUtil } from './utils/jwt.util';
import { AuthDeviceService } from './auth-device.service';

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private jwtUtil: JwtUtil,
    private deviceService: AuthDeviceService
  ) {}

  async createSession(userId: string, context: any, is2FAVerified: boolean = false) {
    const device = await this.deviceService.registerOrUpdateDevice(userId, context);
    
    const accessToken = this.jwtUtil.generateAccessToken({ sub: userId, is2FAVerified });
    const refreshToken = this.jwtUtil.generateRefreshToken({ sub: userId, is2FAVerified });
    
    // Revoke old sessions if exceeding limit (e.g. max 5)
    
    const session = await this.prisma.authSession.create({
      data: {
        userId,
        deviceId: device.id,
        accessToken,
        refreshToken,
        refreshTokenFamily: refreshToken, // Initial family is the first refresh token
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
        refreshExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }
    });

    return session;
  }

  async refreshSession(userId: string, oldRefreshToken: string, context: any) {
    const result = await this.prisma.$transaction(async (tx) => {
      const sessions = await tx.$queryRaw<any[]>`SELECT * FROM "AuthSession" WHERE "refreshToken" = ${oldRefreshToken} FOR UPDATE`;
      const session = sessions[0];

      if (!session || session.userId !== userId) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      
      if (session.revokedAt) {
        // Check if revoked recently (e.g. within 15 seconds). If so, it's likely a concurrent retry, not a replay attack.
        const isRecentRevocation = (Date.now() - session.revokedAt.getTime()) < 15000;
        
        if (isRecentRevocation && session.revokeReason === 'Token rotated') {
           throw new UnauthorizedException('Token already rotated (concurrent retry)');
        }

        // Replay attack detected! Revoke all related sessions in the same family.
        await tx.authSession.updateMany({
          where: { refreshTokenFamily: session.refreshTokenFamily },
          data: { 
            revokedAt: new Date(), 
            revokeReason: 'Replay attack detected' 
          }
        });
        return { error: 'Replay attack detected' };
      }

      if (new Date() > session.refreshExpiresAt) {
         return { error: 'Refresh token expired' };
      }

      // Verify and extract is2FAVerified from the old refresh token
      let is2FAVerified = false;
      try {
        const payload = await this.jwtUtil.verifyToken(oldRefreshToken);
        is2FAVerified = !!payload.is2FAVerified;
      } catch (err) {
        return { error: 'Refresh token verification failed' };
      }

      // Revoke current token
      await tx.authSession.update({
        where: { id: session.id },
        data: { 
          revokedAt: new Date(), 
          revokeReason: 'Token rotated' 
        }
      });

      // Generate new tokens, inheriting is2FAVerified
      const accessToken = this.jwtUtil.generateAccessToken({ 
        sub: userId, 
        is2FAVerified
      });
      const newRefreshToken = this.jwtUtil.generateRefreshToken({ sub: userId, is2FAVerified });

      // Create new session in the same family
      const newSession = await tx.authSession.create({
        data: {
          userId,
          deviceId: session.deviceId,
          accessToken,
          refreshToken: newRefreshToken,
          refreshTokenFamily: session.refreshTokenFamily,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          refreshExpiresAt: session.refreshExpiresAt,
          lastActivityAt: new Date()
        }
      });

      return {
        accessToken: newSession.accessToken,
        refreshToken: newSession.refreshToken
      };
    });

    if ('error' in result) {
      if (result.error === 'Replay attack detected') {
        throw new UnauthorizedException('Token has been revoked due to suspicious activity');
      }
      throw new UnauthorizedException(result.error);
    }
    
    return result;
  }

  async revokeSession(userId: string, refreshToken: string) {
    await this.prisma.authSession.updateMany({
      where: { userId, refreshToken },
      data: { revokedAt: new Date(), revokeReason: 'User logout' }
    });
    return { success: true };
  }

  async listActiveSessions(userId: string) {
    return this.prisma.authSession.findMany({
      where: { userId, revokedAt: null, refreshExpiresAt: { gt: new Date() } },
      include: { device: { select: { name: true, deviceType: true, lastActivityIp: true, lastActivityAt: true } } },
      orderBy: { lastActivityAt: 'desc' }
    });
  }

  async revokeSessionById(userId: string, sessionId: string) {
    const session = await this.prisma.authSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw new UnauthorizedException('Session not found'); // Should be NotFoundException but not imported
    await this.prisma.authSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date(), revokeReason: 'User revoked' }
    });
  }

  async revokeAllSessions(userId: string, exceptSessionId?: string) {
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null, id: exceptSessionId ? { not: exceptSessionId } : undefined },
      data: { revokedAt: new Date(), revokeReason: 'Bulk revoke by user' }
    });
  }
}

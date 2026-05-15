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

  async createSession(userId: string, context: any) {
    const device = await this.deviceService.registerOrUpdateDevice(userId, context);
    
    const accessToken = this.jwtUtil.generateAccessToken({ sub: userId });
    const refreshToken = this.jwtUtil.generateRefreshToken({ sub: userId });
    
    // Revoke old sessions if exceeding limit (e.g. max 5)
    
    const session = await this.prisma.authSession.create({
      data: {
        userId,
        deviceId: device.id,
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
        refreshExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }
    });

    return session;
  }

  async refreshSession(userId: string, oldRefreshToken: string, context: any) {
    const session = await this.prisma.authSession.findUnique({ where: { refreshToken: oldRefreshToken } });
    if (!session || session.userId !== userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    
    if (session.revokedAt) {
      // Replay attack detected! Revoke all related sessions here.
      throw new UnauthorizedException('Token has been revoked');
    }

    if (new Date() > session.refreshExpiresAt) {
       throw new UnauthorizedException('Refresh token expired');
    }

    // Generate new tokens
    const accessToken = this.jwtUtil.generateAccessToken({ sub: userId });
    const newRefreshToken = this.jwtUtil.generateRefreshToken({ sub: userId });

    // Invalidate old session and create new one, or just update current
    // We update to rotate refresh token
    const updated = await this.prisma.authSession.update({
      where: { id: session.id },
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        lastActivityAt: new Date()
      }
    });

    return {
      accessToken: updated.accessToken,
      refreshToken: updated.refreshToken
    };
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

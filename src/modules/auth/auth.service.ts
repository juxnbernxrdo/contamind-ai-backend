import { Injectable, UnauthorizedException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordUtil } from './utils/password.util';
import { AuthSessionService } from './auth-session.service';
import { AuthAuditService } from './auth-audit.service';
import { RateLimitUtil } from './utils/rate-limit.util';
import { AnomalyScorerUtil } from './utils/anomaly-scorer.util';
import { GeolocationUtil } from './utils/geolocation.util';
import { TokenBlacklistUtil } from './utils/token-blacklist.util';
import { PermissionCacheUtil } from './utils/permission-cache.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordUtil: PasswordUtil,
    private readonly sessionService: AuthSessionService,
    private readonly auditService: AuthAuditService,
    private readonly rateLimitUtil: RateLimitUtil,
    private readonly anomalyService: AnomalyScorerUtil,
    private readonly geoUtil: GeolocationUtil,
    private readonly jwtService: JwtService,
    private readonly blacklistUtil: TokenBlacklistUtil,
    private readonly permissionCache: PermissionCacheUtil,
  ) {}

  async register(dto: RegisterDto, context: any) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new BadRequestException('Email already exists');

    const hashedPassword = await this.passwordUtil.hash(dto.password);
    
    // Populate geolocation
    context.geolocation = this.geoUtil.getLocation(context.ip);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hashedPassword,
        tenantId: dto.tenantId,
        firstName: dto.name,
      },
    });

    await this.auditService.log(dto.tenantId, user.id, 'register', context, 'success');
    return { message: 'Registration successful', userId: user.id };
  }

  async login(dto: LoginDto, context: any) {
    // ━━━ RATE LIMITING ━━━
    const rateLimitKey = `login:${dto.email}`;
    const rateLimitCheck = await this.rateLimitUtil.checkRateLimit(rateLimitKey, 5, 60);
    
    // POPULATE GEOLOCATION
    context.geolocation = this.geoUtil.getLocation(context.ip);

    if (!rateLimitCheck.allowed) {
      await this.auditService.log(
        'unknown-tenant',
        'unknown-user',
        'login',
        context,
        'failure',
        `Rate limit exceeded: ${rateLimitCheck.retryAfterSeconds}s remaining`
      );
      throw new HttpException(
        `Too many login attempts. Try again in ${rateLimitCheck.retryAfterSeconds} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
    // ━━━ FIN RATE LIMITING ━━━

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      await this.passwordUtil.compare('dummy', '$2b$12$invalidhashpadddddddddddddddddddddddddddddddddddddddddd');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.accountLocked && user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      throw new UnauthorizedException('Account locked');
    }

    const isValid = await this.passwordUtil.compare(dto.password, user.passwordHash);
    if (!isValid) {
      await this.rateLimitUtil.incrementFailures(`login:${dto.email}`);
      await this.auditService.log(user.tenantId, user.id, 'login', context, 'failure', 'Invalid password');
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.rateLimitUtil.resetFailures(`login:${dto.email}`);

    // ━━━ ANOMALY SCORING (REAL DATA) ━━━
    const [knownCountries, knownUserAgents, failedAttempts, lastLogin, concurrentSessions] = await Promise.all([
      this.auditService.getKnownCountries(user.id),
      this.auditService.getKnownUserAgents(user.id),
      this.auditService.getFailedAttemptsLast24h(user.id),
      this.auditService.getLastSuccessfulLogin(user.id),
      this.prisma.authSession.count({ where: { userId: user.id, revokedAt: null } }),
    ]);

    const anomalyResult = this.anomalyService.score({
      userId: user.id,
      ip: context.ip,
      userAgent: context.userAgent,
      timestamp: new Date(),
      knownCountries,
      knownUserAgents,
      usualHourStart: 8,
      usualHourEnd: 22,
      failedAttemptsLast24h: failedAttempts,
      concurrentSessionsCount: concurrentSessions,
      lastLoginIp: lastLogin?.ipAddress,
      lastLoginTime: lastLogin?.createdAt,
      lastLoginLat: (lastLogin?.geolocation as any)?.lat,
      lastLoginLon: (lastLogin?.geolocation as any)?.lng,
    });

    if (anomalyResult.action === 'block') {
      await this.auditService.log(
        user.tenantId,
        user.id,
        'login',
        context,
        'failure',
        `Anomaly blocked: score=${anomalyResult.total}`
      );
      throw new UnauthorizedException('Login blocked due to suspicious activity.');
    }

    if (anomalyResult.action === 'require_2fa' && !user.twoFAEnabled) {
      await this.auditService.log(
        user.tenantId,
        user.id,
        'login',
        context,
        'failure',
        `2FA required: score=${anomalyResult.total}`
      );
      throw new BadRequestException(
        'Your account requires 2FA for this login. Please enable 2FA first. Reasons: ' +
        anomalyResult.flags.join(', ')
      );
    }
    // ━━━ FIN ANOMALY SCORING ━━━

    const is2FAVerified = !user.twoFAEnabled;
    const session = await this.sessionService.createSession(user.id, context, is2FAVerified);
    await this.auditService.log(user.tenantId, user.id, 'login', context, 'success');

    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
        tenantId: user.tenantId,
        twoFAEnabled: user.twoFAEnabled,
        is2FAVerified,
      },
      ...(anomalyResult.flags.length > 0 && { securityWarnings: anomalyResult.flags }),
    };
  }

  async refresh(user: any, dto: RefreshDto, context: any) {
    return this.sessionService.refreshSession(user.id, dto.refreshToken, context);
  }

  async logout(
    userId: string,
    refreshToken: string,
    accessTokenInfo?: { jti: string; exp: number },
  ) {
    // ━━━ FAIL-CLOSED REVOCATION (Target 4) ━━━
    // We MUST ensure both DB session revocation AND JWT blacklisting succeed.
    await this.sessionService.revokeSession(userId, refreshToken);

    if (accessTokenInfo) {
      await this.blacklistUtil.blacklistToken(
        accessTokenInfo.jti,
        accessTokenInfo.exp,
      );
    }

    return { success: true };
  }

  async generateReauthToken(userId: string, password: string, context: any): Promise<{ reauthToken: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const isValid = await this.passwordUtil.compare(password, user.passwordHash);
    if (!isValid) {
      await this.auditService.log(user.tenantId, user.id, 'reauth', context, 'failure', 'Invalid password');
      throw new UnauthorizedException('Invalid credentials');
    }

    const reauthToken = this.jwtService.sign(
      { sub: userId, reauth: true },
      { expiresIn: '5m' },
    );

    await this.auditService.log(user.tenantId, user.id, 'reauth', context, 'success');
    return { reauthToken };
  }

  async changePassword(userId: string, dto: ChangePasswordDto, context: any): Promise<{ message: string }> {
    if (dto.newPassword !== dto.newPasswordConfirm) {
      throw new BadRequestException('New passwords do not match');
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const isCurrentValid = await this.passwordUtil.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      await this.auditService.log(user.tenantId, user.id, 'change_password', context, 'failure', 'Wrong current password');
      throw new UnauthorizedException('Current password is incorrect');
    }

    for (const oldHash of user.passwordHistory) {
      if (await this.passwordUtil.compare(dto.newPassword, oldHash)) {
        throw new BadRequestException('New password must not be the same as your last 5 passwords');
      }
    }

    const newHash = await this.passwordUtil.hash(dto.newPassword);
    const updatedHistory = [user.passwordHash, ...user.passwordHistory].slice(0, 5);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        passwordHistory: updatedHistory,
        passwordChangedAt: new Date(),
        securityVersion: { increment: 1 },
      },
    });

    await this.permissionCache.invalidate(userId);
    await this.sessionService.revokeAllSessions(userId);
    await this.auditService.log(user.tenantId, user.id, 'change_password', context, 'success');
    return { message: 'Password changed successfully. All sessions have been revoked.' };
  }
}

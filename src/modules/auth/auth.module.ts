import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthAdminController } from './auth-admin.controller';
import { AuthSessionController } from './auth-session.controller';
import { AuthDeviceController } from './auth-device.controller';
import { Auth2FAController } from './auth-2fa.controller';
import { AuthDelegationController } from './auth-delegation.controller';

import { AuthService } from './auth.service';
import { AuthAdminService } from './auth-admin.service';
import { AuthSessionService } from './auth-session.service';
import { AuthDeviceService } from './auth-device.service';
import { AuthAuditService } from './auth-audit.service';
import { AuthAnomalyService } from './auth-anomaly.service';
import { Auth2FAService } from './auth-2fa.service';
import { AuthDelegationService } from './auth-delegation.service';
import { AuthM2MService } from './auth-m2m.service';

import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

import { PasswordUtil } from './utils/password.util';
import { JwtUtil } from './utils/jwt.util';
import { DeviceFingerprintUtil } from './utils/device-fingerprint.util';
import { GeolocationUtil } from './utils/geolocation.util';
import { AnomalyScorerUtil } from './utils/anomaly-scorer.util';
import { RateLimitUtil } from './utils/rate-limit.util';
import { TokenBlacklistUtil } from './utils/token-blacklist.util';
import { PermissionCacheUtil } from './utils/permission-cache.util';

import { PermissionGuard } from './guards/permission.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [
    RedisModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    AuthController,
    AuthAdminController,
    AuthSessionController,
    AuthDeviceController,
    Auth2FAController,
    AuthDelegationController,
  ],
  providers: [
    PrismaService,
    AuthService,
    AuthAdminService,
    AuthSessionService,
    AuthDeviceService,
    AuthAuditService,
    AuthAnomalyService,
    Auth2FAService,
    AuthDelegationService,
    AuthM2MService,
    JwtStrategy,
    JwtRefreshStrategy,
    PasswordUtil,
    JwtUtil,
    DeviceFingerprintUtil,
    GeolocationUtil,
    AnomalyScorerUtil,
    RateLimitUtil,
    TokenBlacklistUtil,
    PermissionCacheUtil,
    PermissionGuard,
  ],
  exports: [AuthService, AuthSessionService, AuthDeviceService, AuthAuditService, Auth2FAService, TokenBlacklistUtil, PermissionCacheUtil],
})
export class AuthModule {}

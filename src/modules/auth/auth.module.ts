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
import { EncryptionUtil } from './utils/encryption.util';

import { PermissionGuard } from './guards/permission.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [
    RedisModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const privateKey = configService.get<string>('JWT_PRIVATE_KEY');
        const publicKey = configService.get<string>('JWT_PUBLIC_KEY');

        if (!privateKey || !publicKey) {
          throw new Error(
            'CRITICAL: JWT_PRIVATE_KEY or JWT_PUBLIC_KEY is missing. RS256 mandatory for production.',
          );
        }

        if (!privateKey.includes('BEGIN PRIVATE KEY')) {
          throw new Error(
            'CRITICAL: JWT_PRIVATE_KEY must be a valid PKCS#8 private key.',
          );
        }

        // Target 7 — Startup hard-fail on weak/mismatched keys
        try {
          const crypto = require('crypto');
          const signer = crypto.createSign('RSA-SHA256');
          signer.update('test');
          const signature = signer.sign(privateKey);

          const verifier = crypto.createVerify('RSA-SHA256');
          verifier.update('test');
          const isValid = verifier.verify(publicKey, signature);

          if (!isValid) {
            throw new Error('Keys do not match.');
          }
          
          // Check bit length (minimum 2048)
          const keyObject = crypto.createPrivateKey(privateKey);
          if (keyObject.asymmetricKeyDetails?.modulusLength < 2048) {
            throw new Error('Key length must be at least 2048 bits.');
          }
        } catch (e) {
          throw new Error(`CRITICAL: JWT Key Integrity Check Failed: ${e.message}`);
        }

        return {
          privateKey,
          publicKey,
          signOptions: { algorithm: 'RS256', expiresIn: '15m' },
          verifyOptions: { algorithms: ['RS256'] },
        };
      },
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
    EncryptionUtil,
    PermissionGuard,
  ],
  exports: [AuthService, AuthSessionService, AuthDeviceService, AuthAuditService, Auth2FAService, TokenBlacklistUtil, PermissionCacheUtil],
})
export class AuthModule {}

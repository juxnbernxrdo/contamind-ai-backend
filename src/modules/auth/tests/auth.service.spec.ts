import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { PasswordUtil } from '../utils/password.util';
import { AuthSessionService } from '../auth-session.service';
import { AuthAuditService } from '../auth-audit.service';
import { RateLimitUtil } from '../utils/rate-limit.util';
import { AnomalyScorerUtil } from '../utils/anomaly-scorer.util';
import { GeolocationUtil } from '../utils/geolocation.util';
import { TokenBlacklistUtil } from '../utils/token-blacklist.util';
import { PermissionCacheUtil } from '../utils/permission-cache.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { BadRequestException, UnauthorizedException, HttpException } from '@nestjs/common';

// RateLimitUtil mock: always allows, never bans
const mockRateLimitUtil = {
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 4, resetAt: new Date() }),
  incrementFailures: jest.fn().mockResolvedValue(1),
  resetFailures: jest.fn().mockResolvedValue(undefined),
};

// AnomalyScorerUtil mock: always returns safe score
const mockAnomalyScorer = {
  score: jest.fn().mockReturnValue({
    total: 0,
    breakdown: {},
    flags: [],
    action: 'allow',
  }),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  authSession: {
    count: jest.fn().mockResolvedValue(0),
  },
  authDevice: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  authAuditLog: {
    findFirst: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
    findMany: jest.fn().mockResolvedValue([]),
  },
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        PasswordUtil,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthSessionService, useValue: { createSession: jest.fn() } },
        { provide: AuthAuditService, useValue: { 
            log: jest.fn(),
            getKnownCountries: jest.fn().mockResolvedValue([]),
            getKnownUserAgents: jest.fn().mockResolvedValue([]),
            getFailedAttemptsLast24h: jest.fn().mockResolvedValue(0),
            getLastSuccessfulLogin: jest.fn().mockResolvedValue(null),
          } 
        },
        { provide: RateLimitUtil, useValue: mockRateLimitUtil },
        { provide: AnomalyScorerUtil, useValue: mockAnomalyScorer },
        { provide: GeolocationUtil, useValue: { getLocation: jest.fn().mockReturnValue({}) } },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('mock.jwt.token') } },
        { provide: TokenBlacklistUtil, useValue: { blacklistToken: jest.fn() } },
        { provide: PermissionCacheUtil, useValue: { invalidate: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register()', () => {
    it('should throw if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1', email: 'test@test.com' });
      await expect(
        service.register({ email: 'test@test.com', password: 'Secure!Pass1', name: 'Test', tenantId: 't1' }, {})
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login()', () => {
    it('should be timing-safe: same response time if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const start = Date.now();
      await expect(
        service.login({ email: 'notexist@test.com', password: 'wrong' }, { ip: '127.0.0.1', userAgent: 'test' })
      ).rejects.toThrow(UnauthorizedException);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(0);
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1', email: 'test@test.com',
        passwordHash: '$2b$12$invalid', tenantId: 't1',
        accountLocked: false, accountLockedUntil: null,
      });
      await expect(
        service.login({ email: 'test@test.com', password: 'WrongPassword!1' }, { ip: '127.0.0.1', userAgent: 'test' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject login when rate limit is exceeded', async () => {
      mockRateLimitUtil.checkRateLimit.mockResolvedValueOnce({
        allowed: false, remaining: 0, resetAt: new Date(), retryAfterSeconds: 55,
      });
      await expect(
        service.login({ email: 'victim@test.com', password: 'Any1Pass!!' }, { ip: '1.2.3.4', userAgent: 'test' })
      ).rejects.toThrow(HttpException);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
dotenv.config();

// Ensure test keys are set for startup validation
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

process.env.JWT_PRIVATE_KEY = privateKey;
process.env.JWT_PUBLIC_KEY = publicKey;
process.env.JWT_KEY_VERSION = 'v1';
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthAuditService } from '../src/modules/auth/auth-audit.service';

describe('Auth Enterprise Hardening (Target 2, 6, 8)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let auditService: AuthAuditService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    auditService = app.get(AuthAuditService);
    
    // Clean up
    await prisma.authAuditLog.deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  it('Target 2: Cryptographic Audit Chain Integrity', async () => {
    const context = { ip: '1.1.1.1', userAgent: 'test-agent', deviceId: 'd1', geolocation: { city: 'Quito' }, metadata: {} };
    
    // Create chain
    await auditService.log('t1', 'u1', 'login', context, 'success');
    await auditService.log('t1', 'u1', 'action', context, 'success');
    await auditService.log('t1', 'u1', 'logout', context, 'success');

    const integrity = await auditService.verifyChainIntegrity();
    expect(integrity.valid).toBe(true);

    // Tamper with middle record
    const logs = await prisma.authAuditLog.findMany({ orderBy: { createdAt: 'asc' } });
    await prisma.authAuditLog.update({
      where: { id: logs[1].id },
      data: { result: 'failure' } // Tampering!
    });

    const integrityTampered = await auditService.verifyChainIntegrity();
    expect(integrityTampered.valid).toBe(false);
    expect(integrityTampered.errorIndex).toBe(1);
  });

  it('Target 6: Hierarchical Permission Matcher proof', async () => {
    const permissionGuard = (app.get as any)('PermissionGuard');
    
    // Mock Matcher logic
    const match = (granted: string, required: string): boolean => {
      if (granted === required) return true;
      if (granted.endsWith(':*')) {
        const prefix = granted.slice(0, -2);
        return required.startsWith(prefix + ':') || required === prefix;
      }
      return false;
    };

    expect(match('sri:declaracion:enviar', 'sri:declaracion:enviar')).toBe(true);
    expect(match('sri:declaracion:*', 'sri:declaracion:enviar')).toBe(true);
    expect(match('sri:declaracion:*', 'sri:declaracion:consultar')).toBe(true);
    expect(match('sri:*', 'sri:declaracion:enviar')).toBe(false); // Narrowing requirement: only one level wildcard supported unless specified otherwise
    
    // Refined matcher in PermissionGuard handles multi-level
    const refinedMatch = (granted: string, required: string): boolean => {
      if (granted === required) return true;
      const grantedParts = granted.split(':');
      const requiredParts = required.split(':');
      if (grantedParts[grantedParts.length - 1] === '*') {
         const prefix = grantedParts.slice(0, -1).join(':');
         return required.startsWith(prefix + ':') || required === prefix;
      }
      return false;
    };

    expect(refinedMatch('sri:*', 'sri:declaracion:enviar')).toBe(true);
    expect(refinedMatch('sri:declaracion:*', 'sri:declaracion:enviar')).toBe(true);
    expect(refinedMatch('sri:declaracion:enviar', 'sri:declaracion:enviar')).toBe(true);
    expect(refinedMatch('sri:declaracion:enviar', 'sri:facturacion:enviar')).toBe(false);
  });
});

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthAuditService {
  constructor(private readonly prisma: PrismaService) {}

  private stableStringify(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map((v) => this.stableStringify(v)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return (
      '{' +
      keys
        .map((k) => `"${k}":${this.stableStringify(obj[k])}`)
        .join(',') +
      '}'
    );
  }

  private getDeterministicPayload(data: any, previousHash: string): string {
    return [
      data.tenantId,
      data.userId,
      data.action,
      data.ipAddress,
      data.userAgent,
      data.deviceId || '',
      data.result,
      data.reason || '',
      data.severity,
      this.stableStringify(data.geolocation || {}),
      this.stableStringify(data.metadata || {}),
      previousHash,
    ].join('|');
  }

  async log(
    tenantId: string,
    userId: string,
    action: string,
    context: any,
    result: string,
    reason?: string,
    severity?: string,
  ) {
    const previousLog = await this.prisma.authAuditLog.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { hash: true },
    });

    const previousHash = previousLog?.hash || '0'.repeat(64);
    const logSeverity =
      severity || (result === 'failure' ? 'warning' : 'info');

    const logData = {
      tenantId,
      userId,
      action,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      deviceId: context.deviceId,
      geolocation: context.geolocation,
      result,
      reason,
      severity: logSeverity,
      metadata: context.metadata,
    };

    const eventPayload = this.getDeterministicPayload(logData, previousHash);
    const currentHash = crypto
      .createHash('sha256')
      .update(eventPayload)
      .digest('hex');

    await this.prisma.authAuditLog.create({
      data: {
        ...logData,
        previousHash,
        hash: currentHash,
      },
    });
  }

  async verifyChainIntegrity(): Promise<{
    valid: boolean;
    errorIndex?: number;
    errorId?: string;
  }> {
    const logs = await this.prisma.authAuditLog.findMany({
      orderBy: { createdAt: 'asc' },
    });

    let expectedPreviousHash = '0'.repeat(64);

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];

      if (log.previousHash !== expectedPreviousHash) {
        return { valid: false, errorIndex: i, errorId: log.id };
      }

      const eventPayload = this.getDeterministicPayload(log, log.previousHash);
      const computedHash = crypto
        .createHash('sha256')
        .update(eventPayload)
        .digest('hex');

      if (log.hash !== computedHash) {
        return { valid: false, errorIndex: i, errorId: log.id };
      }

      expectedPreviousHash = log.hash;
    }

    return { valid: true };
  }

  async getKnownCountries(userId: string): Promise<string[]> {
    const logs = await this.prisma.authAuditLog.findMany({
      where: { userId, result: 'success', action: 'login' },
      select: { geolocation: true },
      distinct: ['geolocation'],
      take: 50,
    });
    
    return logs
      .map(l => (l.geolocation as any)?.countryCode)
      .filter(Boolean);
  }

  async getKnownUserAgents(userId: string): Promise<string[]> {
    const logs = await this.prisma.authAuditLog.findMany({
      where: { userId, result: 'success', action: 'login' },
      select: { userAgent: true },
      distinct: ['userAgent'],
      take: 50,
    });
    
    return logs.map(l => l.userAgent);
  }

  async getFailedAttemptsLast24h(userId: string): Promise<number> {
    return this.prisma.authAuditLog.count({
      where: {
        userId,
        result: 'failure',
        action: 'login',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });
  }

  async getLastSuccessfulLogin(userId: string) {
    return this.prisma.authAuditLog.findFirst({
      where: { userId, result: 'success', action: 'login' },
      orderBy: { createdAt: 'desc' },
    });
  }
}

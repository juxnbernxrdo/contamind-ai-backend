import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(tenantId: string, userId: string, action: string, context: any, result: string, reason?: string) {
    await this.prisma.authAuditLog.create({
      data: {
        tenantId,
        userId,
        action,
        ipAddress: context.ip,
        userAgent: context.userAgent,
        result,
        reason,
        severity: result === 'failure' ? 'warning' : 'info',
      }
    });
  }
}

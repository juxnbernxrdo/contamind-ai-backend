import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import { Auth2FAService } from './auth-2fa.service';

@Injectable()
export class AuthDelegationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly twoFaService: Auth2FAService,
  ) {}

  async createPendingGrant(tenantId: string, delegatorUserId: string, agentName: string, actionScope: string, contextMetadata: any) {
    // P0 — Prohibit wildcard privilege escalation
    const forbiddenWildcards = ['*', '*:*', '**'];
    if (forbiddenWildcards.includes(actionScope.trim())) {
      throw new BadRequestException('Wildcard privilege escalation is prohibited. Provide an explicit scoped action.');
    }

    const agent = await this.prisma.servicePrincipal.findUnique({ where: { name: agentName } });
    if (!agent) throw new NotFoundException(`Agent ${agentName} not found`);

    return this.prisma.delegationGrant.create({
      data: {
        tenantId,
        delegatorUserId,
        agentId: agent.id,
        actionScope,
        contextMetadata,
        status: 'pending',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour to approve
      }
    });
  }

  async signGrantWithMFA(userId: string, grantId: string, totpToken: string) {
    // Verify MFA first (HITL step)
    const isValid = await this.twoFaService.verifyTotp(userId, totpToken);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA token for signing action');
    }

    const grant = await this.prisma.delegationGrant.findUnique({ where: { id: grantId } });
    if (!grant || grant.delegatorUserId !== userId) {
      throw new NotFoundException('Pending grant not found');
    }

    if (grant.status !== 'pending') {
      throw new BadRequestException('Grant is not in pending status');
    }

    // Generate cryptographic Nonce (ActionToken)
    const actionToken = crypto.randomBytes(32).toString('hex');

    // Update grant status to approved
    return this.prisma.delegationGrant.update({
      where: { id: grantId },
      data: {
        status: 'approved',
        actionToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // Action token valid for 15 minutes
      }
    });
  }

  async consumeGrant(agentId: string, grantId: string, actionToken: string) {
    // ━━━ ATOMIC DOUBLE-CONSUME RESISTANCE (Target 5) ━━━
    const result = await this.prisma.delegationGrant.updateMany({
      where: {
        id: grantId,
        agentId,
        actionToken,
        status: 'approved',
        expiresAt: { gte: new Date() },
      },
      data: {
        status: 'consumed',
      },
    });

    if (result.count === 0) {
      // Re-audit to check reason for failure
      const existing = await this.prisma.delegationGrant.findUnique({
        where: { id: grantId },
      });

      if (!existing) {
        throw new UnauthorizedException('Invalid or unauthorized grant');
      }
      if (existing.status === 'consumed') {
        throw new UnauthorizedException('Grant already consumed (REPLAY DETECTED)');
      }
      if (new Date() > existing.expiresAt) {
        throw new UnauthorizedException('Grant has expired');
      }
      throw new UnauthorizedException(
        'Invalid action token or unauthorized agent',
      );
    }

    return { success: true, message: 'Action legally consumed and audited' };
  }
}

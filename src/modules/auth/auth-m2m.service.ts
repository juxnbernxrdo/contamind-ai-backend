import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtUtil } from './utils/jwt.util';
import { PasswordUtil } from './utils/password.util';

@Injectable()
export class AuthM2MService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtUtil: JwtUtil,
    private readonly passwordUtil: PasswordUtil,
  ) {}

  async issueAgentToken(agentId: string, secretKey: string, grantId: string, actionToken: string): Promise<string> {
    const agent = await this.prisma.servicePrincipal.findUnique({ where: { id: agentId } });
    if (!agent || !agent.isActive) {
      throw new UnauthorizedException('Invalid or inactive agent');
    }

    // MANDATORY: Verify secretKey against hashedSecret
    if (!agent.hashedSecret) {
      throw new UnauthorizedException('Agent secret not configured');
    }

    const isSecretValid = await this.passwordUtil.compare(secretKey, agent.hashedSecret);
    if (!isSecretValid) {
      throw new UnauthorizedException('Invalid agent credentials');
    }

    // ATOMIC: Verify and consume the grant in one go to prevent race conditions (P0 REQUIREMENT)
    const updatedGrant = await this.prisma.delegationGrant.updateMany({
      where: { 
        id: grantId, 
        agentId: agentId,
        actionToken: actionToken, // Cryptographic HITL validation
        status: 'approved',
        expiresAt: { gt: new Date() }
      },
      data: { status: 'consumed', updatedAt: new Date() }
    });

    if (updatedGrant.count === 0) {
      throw new UnauthorizedException('Grant is not valid, already consumed, or expired');
    }

    // Since we updated it, we can now fetch the full grant details safely
    const grant = await this.prisma.delegationGrant.findUniqueOrThrow({ where: { id: grantId } });

    const payload = {
      sub: agentId,
      type: 'm2m',
      sv: agent.securityVersion,
      grantId: grant.id,
      tenantId: grant.tenantId,
      delegatorId: grant.delegatorUserId,
      actionToken: grant.actionToken,
      actionScope: grant.actionScope,
    };

    return this.jwtUtil.generateAccessToken(payload);
  }
}

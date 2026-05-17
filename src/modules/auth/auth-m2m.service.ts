import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtUtil } from './utils/jwt.util';

@Injectable()
export class AuthM2MService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtUtil: JwtUtil,
  ) {}

  async issueAgentToken(agentId: string, secretKey: string, grantId: string): Promise<string> {
    // In a real scenario, the secretKey would be verified against the Agent's public key or a hashed secret.
    // For this MVP, we just verify the agent exists and is active.
    const agent = await this.prisma.servicePrincipal.findUnique({ where: { id: agentId } });
    if (!agent || !agent.isActive) {
      throw new UnauthorizedException('Invalid or inactive agent');
    }

    // Verify the grant exists and is approved, and belongs to this agent
    const grant = await this.prisma.delegationGrant.findUnique({ where: { id: grantId } });
    if (!grant) {
      throw new UnauthorizedException('Grant not found');
    }
    if (grant.agentId !== agentId) {
      throw new UnauthorizedException('Grant does not belong to this agent');
    }
    if (grant.status !== 'approved' || !grant.actionToken) {
      throw new UnauthorizedException('Grant is not approved for execution');
    }
    if (new Date() > grant.expiresAt) {
      throw new UnauthorizedException('Grant has expired');
    }

    // Issue a short-lived JWT (e.g., 5 minutes) specifically for M2M context
    const payload = {
      sub: agentId,
      type: 'm2m',
      grantId: grant.id,
      tenantId: grant.tenantId,
      delegatorId: grant.delegatorUserId,
      actionToken: grant.actionToken,
      actionScope: grant.actionScope,
    };

    // Assuming jwtUtil can sign an arbitrary payload. We might need a specific M2M secret, but using the default for now.
    // Actually, let's use the JwtService from nestjs/jwt if jwtUtil doesn't support custom exp.
    // We'll see how jwtUtil is implemented. For now, generateAccessToken sets it to 15m.
    return this.jwtUtil.generateAccessToken(payload);
  }
}

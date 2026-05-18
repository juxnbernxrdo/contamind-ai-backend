import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistUtil } from '../utils/token-blacklist.util';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private blacklistUtil: TokenBlacklistUtil,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) throw new UnauthorizedException();
    
    try {
      const publicKey = this.configService.get<string>('JWT_PUBLIC_KEY');
      const payload = await this.jwtService.verifyAsync(token, {
        secret: publicKey,
        algorithms: ['RS256']
      });

      // ━━━ BLACKLIST CHECK (FAIL-CLOSED) ━━━
      if (payload.jti) {
        const isBlacklisted = await this.blacklistUtil.isBlacklisted(payload.jti);
        if (isBlacklisted) {
          throw new UnauthorizedException('Token has been revoked');
        }
      }

      // ━━━ LIVE SECURITY RECONCILIATION ━━━
      if (payload.type === 'm2m') {
        const agent = await this.prisma.servicePrincipal.findUnique({
          where: { id: payload.sub },
          select: { securityVersion: true, isActive: true }
        });

        if (!agent || !agent.isActive) {
          throw new UnauthorizedException('Service Principal is inactive or does not exist');
        }

        if (payload.sv !== undefined && payload.sv !== agent.securityVersion) {
          throw new UnauthorizedException('Security state changed. Please re-authenticate agent.');
        }

        request['user'] = {
          id: payload.sub,
          type: 'm2m',
          tenantId: payload.tenantId,
          grantId: payload.grantId,
          delegatorId: payload.delegatorId,
          actionScope: payload.actionScope,
          jti: payload.jti,
          exp: payload.exp,
          sv: payload.sv
        };
      } else {
        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: { securityVersion: true, accountLocked: true, accountDisabled: true, tenantId: true }
        });

        if (!user || user.accountDisabled || user.accountLocked) {
          throw new UnauthorizedException('Account is restricted or does not exist');
        }

        // If sv exists in payload, it MUST match the DB
        if (payload.sv !== undefined && payload.sv !== user.securityVersion) {
          throw new UnauthorizedException('Security state changed. Please login again.');
        }

        // Populate full user context from payload and DB
        request['user'] = { 
          id: payload.sub,
          type: 'human',
          email: payload.email,
          roles: payload.roles,
          tenantId: user.tenantId,
          is2FAVerified: payload.is2FAVerified,
          jti: payload.jti,
          exp: payload.exp,
          sv: payload.sv
        };
      }
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException(e.message || 'Invalid token');
    }
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

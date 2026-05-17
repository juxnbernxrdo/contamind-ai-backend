import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistUtil } from '../utils/token-blacklist.util';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private blacklistUtil: TokenBlacklistUtil,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) throw new UnauthorizedException();
    
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET')
      });

      // ━━━ BLACKLIST CHECK ━━━
      if (payload.jti) {
        const isBlacklisted = await this.blacklistUtil.isBlacklisted(payload.jti);
        if (isBlacklisted) {
          throw new UnauthorizedException('Token has been revoked');
        }
      }

      // Populate full user context from payload
      request['user'] = { 
        id: payload.sub,
        email: payload.email,
        roles: payload.roles,
        tenantId: payload.tenantId,
        is2FAVerified: payload.is2FAVerified,
        jti: payload.jti,
        exp: payload.exp
      };
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

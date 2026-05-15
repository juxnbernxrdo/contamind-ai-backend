import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtRefreshGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { refreshToken } = request.body;
    
    if (!refreshToken) throw new UnauthorizedException();
    
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);
      request['user'] = { id: payload.sub };
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}

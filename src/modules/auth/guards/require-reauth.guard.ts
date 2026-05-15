import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RequireReauthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { reauthToken } = request.body;

    if (!reauthToken) {
      throw new BadRequestException(
        'Reauth token required for this operation. Call /auth/reauth first.',
      );
    }

    try {
      const payload = await this.jwtService.verifyAsync(reauthToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Verificar que el token sea de reauth
      if (!payload.reauth) {
        throw new UnauthorizedException('Invalid token type. Reauth token required.');
      }

      // El token es válido, inyectarlo en el request
      request.user = { ...request.user, id: payload.sub };
      return true;
    } catch (err) {
      throw new UnauthorizedException('Reauth token invalid or expired.');
    }
  }
}

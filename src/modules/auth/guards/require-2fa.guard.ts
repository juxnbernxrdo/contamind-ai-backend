import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class Require2FAGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Si el usuario no tiene 2FA habilitado en su perfil, técnicamente está "verificado"
    // Pero según el requerimiento, el token ya debería traer el flag is2FAVerified.
    return user.is2FAVerified === true;
  }
}

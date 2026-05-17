import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';
import { PermissionCacheUtil } from '../utils/permission-cache.util';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly permissionCache: PermissionCacheUtil,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      'permission',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest();
    const userId: string = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('No authenticated user in request');
    }

    // ━━━ CACHÉ REDIS ━━━
    let userPermissions = await this.permissionCache.getPermissions(userId);

    // Si no está en caché, consultar DB
    if (!userPermissions) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          permissions: true,
        },
      });

      if (!user) {
        throw new ForbiddenException('User not found');
      }

      if (user.accountDisabled || user.accountLocked) {
        throw new ForbiddenException('Account is inactive');
      }

      // Extraer permisos directos
      userPermissions = user.permissions.flatMap((p) => [
        `${p.module}.${p.action}`,
        p.module,
        p.action,
        `${p.module}:*`, // Wildcard support
      ]);

      // Guardar en caché por 5 minutos
      await this.permissionCache.setPermissions(userId, userPermissions);
    }

    // ━━━ FIN CACHÉ ━━━

    const hasPermission = userPermissions.includes(requiredPermission);

    if (!hasPermission) {
      throw new ForbiddenException(`Missing required permission: ${requiredPermission}`);
    }

    return true;
  }
}

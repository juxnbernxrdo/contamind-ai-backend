import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
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
    const cacheKey = `perms:${userId}`;
    let userPermissions: string[] = [];

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        userPermissions = JSON.parse(cached);
      }
    } catch (err) {
      // Redis error, ignorar y consultar DB
    }

    // Si no está en caché, consultar DB
    if (userPermissions.length === 0) {
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

      // Extraer permisos directos (basado en el esquema real)
      userPermissions = user.permissions.flatMap((p) => [
        `${p.module}.${p.action}`,
        p.module,
        p.action,
        `${p.module}:*`, // Wildcard support
      ]);

      // Guardar en caché por 5 minutos
      try {
        await this.redis.setex(cacheKey, 300, JSON.stringify(userPermissions));
      } catch (err) {
        // Redis error, continuar sin caché
      }
    }

    // ━━━ FIN CACHÉ ━━━

    const hasPermission = userPermissions.includes(requiredPermission);

    if (!hasPermission) {
      throw new ForbiddenException(`Missing required permission: ${requiredPermission}`);
    }

    return true;
  }
}

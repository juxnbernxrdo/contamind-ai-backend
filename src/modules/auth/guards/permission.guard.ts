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

  private static match(granted: string, required: string): boolean {
    if (granted === required) return true;

    // Deterministic hierarchical matching: module:resource:action
    // Granted can end with :* for explicit narrowing
    if (granted.endsWith(':*')) {
      const prefix = granted.slice(0, -2);
      const prefixParts = prefix.split(':');
      const requiredParts = required.split(':');

      if (prefixParts.length >= requiredParts.length) return false;

      for (let i = 0; i < prefixParts.length; i++) {
        if (prefixParts[i] !== requiredParts[i]) return false;
      }
      return true;
    }

    return false;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      'permission',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('No authenticated identity in request');
    }

    // ━━━ M2M SCOPE VALIDATION ━━━
    if (user.type === 'm2m') {
      const scope = user.actionScope;
      if (!scope) throw new ForbiddenException('Agent has no action scope');

      // Prohibit wildcard privilege escalation (Target 5)
      if (
        scope === '*' ||
        scope === '*:*' ||
        scope === '**' ||
        scope.includes('**')
      ) {
        throw new ForbiddenException(
          'Wildcard privilege escalation detected and prohibited',
        );
      }

      if (PermissionGuard.match(scope, requiredPermission)) return true;

      throw new ForbiddenException(
        `Agent scope "${scope}" does not permit: ${requiredPermission}`,
      );
    }

    // ━━━ HUMAN USER PERMISSIONS ━━━
    const userId = user.id;
    let userPermissions = await this.permissionCache.getPermissions(userId);

    if (!userPermissions) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { permissions: true },
      });

      if (!dbUser || dbUser.accountDisabled || dbUser.accountLocked) {
        throw new ForbiddenException('Account is inactive');
      }

      userPermissions = dbUser.permissions.map(
        (p) => `${p.module}:${p.action}`,
      );
      await this.permissionCache.setPermissions(userId, userPermissions);
    }

    // DENY BY DEFAULT
    const hasPermission = userPermissions.some((granted) =>
      PermissionGuard.match(granted, requiredPermission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing required permission: ${requiredPermission}`,
      );
    }

    return true;
  }
}

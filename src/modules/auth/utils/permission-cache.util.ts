import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class PermissionCacheUtil {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  private getCacheKey(userId: string): string {
    return `perms:${userId}`;
  }

  async getPermissions(userId: string): Promise<string[] | null> {
    try {
      const cached = await this.redis.get(this.getCacheKey(userId));
      return cached ? JSON.parse(cached) : null;
    } catch (err) {
      return null;
    }
  }

  async setPermissions(userId: string, permissions: string[]): Promise<void> {
    try {
      await this.redis.setex(this.getCacheKey(userId), 300, JSON.stringify(permissions));
    } catch (err) {
      // Ignore Redis errors
    }
  }

  async invalidate(userId: string): Promise<void> {
    try {
      await this.redis.del(this.getCacheKey(userId));
    } catch (err) {
      // Ignore Redis errors
    }
  }
}

import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class TokenBlacklistUtil {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async blacklistToken(jti: string, expiresAt: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const ttl = expiresAt - now;

    if (ttl > 0) {
      await this.redis.set(`blacklist:${jti}`, 'true', 'EX', ttl);
    }
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    const result = await this.redis.get(`blacklist:${jti}`);
    return result === 'true';
  }
}

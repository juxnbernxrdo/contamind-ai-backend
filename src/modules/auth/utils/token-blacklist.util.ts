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
      try {
        await this.redis.set(`blacklist:${jti}`, 'true', 'EX', ttl);
      } catch (err) {
        console.error('Redis error while blacklisting token:', err);
      }
    }
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    try {
      const result = await this.redis.get(`blacklist:${jti}`);
      return result === 'true';
    } catch (err) {
      console.error('Redis error while checking blacklist, degrading gracefully (fail-open):', err);
      return false; // Fail-open to avoid global auth outage
    }
  }
}

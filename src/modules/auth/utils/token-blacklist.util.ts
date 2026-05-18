import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
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
        // P1 — Enforce strict fail-closed Redis writes
        console.error('CRITICAL: Redis error while blacklisting token:', err);
        throw new InternalServerErrorException('Security persistence failure. Revocation could not be guaranteed.');
      }
    }
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    try {
      const result = await this.redis.get(`blacklist:${jti}`);
      return result === 'true';
    } catch (err) {
      console.error('CRITICAL: Redis error while checking blacklist:', err);
      // FAIL-CLOSED: If we can't verify revocation status, we must reject the token
      throw new InternalServerErrorException('Security verification service unavailable');
    }
  }
}

import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import Redis from 'ioredis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds?: number;
}

@Injectable()
export class RateLimitUtil {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  /**
   * Token bucket rate limiting con Redis.
   * @param key - identificador único (e.g. `login:ip:1.2.3.4`)
   * @param limit - max requests en la ventana
   * @param windowSeconds - ventana en segundos
   */
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const redisKey = `rl:${key}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const resetAt = new Date(now + windowMs);

    try {
      // Sliding window con sorted set
      const pipeline = this.redis.pipeline();
      pipeline.zremrangebyscore(redisKey, 0, now - windowMs); // Limpiar expirados
      pipeline.zadd(redisKey, now, `${now}-${Math.random()}`); // Agregar request actual
      pipeline.zcard(redisKey); // Contar requests en ventana
      pipeline.expire(redisKey, windowSeconds + 1); // TTL para cleanup

      const results = await pipeline.exec();

      if (!results) {
        throw new Error('Redis pipeline execution failed');
      }

      // ━━━ FAIL-CLOSED: Check every pipeline command result for errors ━━━
      for (const [err] of results) {
        if (err) throw err;
      }

      const count = results[2][1] as number;
      const allowed = count <= limit;

      if (!allowed) {
        // Calcular cuándo se puede reintentar
        const oldest = await this.redis.zrange(redisKey, 0, 0, 'WITHSCORES');
        const oldestTime = oldest[1] ? parseInt(oldest[1]) : now;
        const retryAfterSeconds = Math.ceil(
          (oldestTime + windowMs - now) / 1000,
        );

        return { allowed: false, remaining: 0, resetAt, retryAfterSeconds };
      }

      return { allowed: true, remaining: limit - count, resetAt };
    } catch (err) {
      console.error('CRITICAL: Redis error in rate-limit check:', err);
      // FAIL-CLOSED: Block if we can't verify rate limits
      throw new InternalServerErrorException(
        'Security verification service unavailable',
      );
    }
  }

  /**
   * Backoff exponencial para login fallido
   * @returns delay en ms que debe esperar el cliente
   */
  async getLoginBackoffDelay(identifier: string): Promise<number> {
    const key = `backoff:${identifier}`;
    try {
      const failures = parseInt(await this.redis.get(key) ?? '0');

      if (failures <= 0) return 0;
      if (failures <= 3) return 1_000;
      if (failures <= 5) return 5_000;
      return 30_000; // máximo 30s
    } catch (err) {
      // Passive check can fail open or return 0
      return 0;
    }
  }

  async incrementFailures(identifier: string, ttlSeconds = 900): Promise<number> {
    const key = `backoff:${identifier}`;
    try {
      const count = await this.redis.incr(key);
      if (count === 1) await this.redis.expire(key, ttlSeconds);
      return count;
    } catch (err) {
      return 0;
    }
  }

  async resetFailures(identifier: string): Promise<void> {
    try {
      await this.redis.del(`backoff:${identifier}`);
    } catch (err) {}
  }

  async temporaryBan(identifier: string, durationSeconds: number): Promise<void> {
    try {
      await this.redis.set(`ban:${identifier}`, '1', 'EX', durationSeconds);
    } catch (err) {}
  }

  async isBanned(identifier: string): Promise<boolean> {
    try {
      return (await this.redis.exists(`ban:${identifier}`)) === 1;
    } catch (err) {
      console.error('CRITICAL: Redis error in ban check:', err);
      // FAIL-CLOSED: Assume banned if we can't check
      throw new InternalServerErrorException('Security verification service unavailable');
    }
  }
}

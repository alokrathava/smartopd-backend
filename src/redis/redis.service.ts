import { Injectable, Inject } from '@nestjs/common';
import type Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  // ─── JWT Blacklist (for logout / token revocation) ────────────────────────

  async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.setex(`bl:${jti}`, ttlSeconds, '1');
    } catch {
      // Degraded mode — token will expire naturally
    }
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    try {
      const result = await this.redis.get(`bl:${jti}`);
      return result === '1';
    } catch {
      return false; // fail open — allow request if Redis unavailable
    }
  }

  // ─── Generic Cache ─────────────────────────────────────────────────────────

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, value);
      } else {
        await this.redis.set(key, value);
      }
    } catch {
      // silently fail — cache miss is safe
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch {
      return null;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch {
      // ignore
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  // ─── Rate Limiting Helpers ─────────────────────────────────────────────────

  async increment(key: string, ttlSeconds: number): Promise<number> {
    try {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, ttlSeconds);
      }
      return count;
    } catch {
      return 0;
    }
  }

  // ─── Pub/Sub for WebSocket Notifications (multi-instance) ─────────────────

  async publish(channel: string, message: string): Promise<void> {
    try {
      await this.redis.publish(channel, message);
    } catch {
      // ignore
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}

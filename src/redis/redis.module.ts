import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const { default: Redis } = await import('ioredis');
        const client = new Redis({
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
          db: configService.get<number>('REDIS_DB', 0),
          retryStrategy: (times: number) => {
            if (times > 3) return null; // stop retrying after 3 attempts
            return Math.min(times * 200, 2000);
          },
          lazyConnect: true,
          enableOfflineQueue: false,
        });

        client.on('error', (err) => {
          // Log but don't crash — app still works without Redis (degraded mode)
          console.warn('[Redis] Connection error (running in degraded mode):', err.message);
        });

        try {
          await client.connect();
          console.log('[Redis] Connected successfully');
        } catch {
          console.warn('[Redis] Could not connect — JWT blacklist and caching disabled');
        }

        return client;
      },
    },
    RedisService,
  ],
  exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule {}

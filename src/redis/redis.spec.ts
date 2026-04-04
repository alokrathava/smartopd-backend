import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';

/**
 * Unit tests for RedisService.
 *
 * The ioredis client is fully mocked — no real Redis instance is required.
 * Every method on RedisService swallows errors in "degraded mode", so tests
 * also verify those silent-fail paths.
 */

const mockRedisClient = {
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
  setex: jest.fn().mockResolvedValue('OK'),
  exists: jest.fn().mockResolvedValue(0),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  ping: jest.fn().mockResolvedValue('PONG'),
  publish: jest.fn().mockResolvedValue(1),
  quit: jest.fn().mockResolvedValue('OK'),
};

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    // Reset all mock call counts/return values before every test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  // ─── Module sanity ──────────────────────────────────────────────────────────

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── blacklistToken ─────────────────────────────────────────────────────────

  describe('blacklistToken()', () => {
    it('stores the JTI with the correct prefixed key and TTL', async () => {
      await service.blacklistToken('abc-123', 900);

      expect(mockRedisClient.setex).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.setex).toHaveBeenCalledWith('bl:abc-123', 900, '1');
    });

    it('does not throw when Redis throws (degraded mode)', async () => {
      mockRedisClient.setex.mockRejectedValueOnce(new Error('Redis down'));

      await expect(service.blacklistToken('jti-fail', 300)).resolves.toBeUndefined();
    });
  });

  // ─── isTokenBlacklisted ─────────────────────────────────────────────────────

  describe('isTokenBlacklisted()', () => {
    it('returns true when the blacklist key holds "1"', async () => {
      mockRedisClient.get.mockResolvedValueOnce('1');

      const result = await service.isTokenBlacklisted('abc-123');

      expect(mockRedisClient.get).toHaveBeenCalledWith('bl:abc-123');
      expect(result).toBe(true);
    });

    it('returns false when the key does not exist (null)', async () => {
      mockRedisClient.get.mockResolvedValueOnce(null);

      const result = await service.isTokenBlacklisted('abc-123');

      expect(result).toBe(false);
    });

    it('returns false (fail-open) when Redis throws', async () => {
      mockRedisClient.get.mockRejectedValueOnce(new Error('Redis unavailable'));

      const result = await service.isTokenBlacklisted('jti-fail');

      expect(result).toBe(false);
    });
  });

  // ─── set / get / del ────────────────────────────────────────────────────────

  describe('set()', () => {
    it('calls redis.set when no TTL is provided', async () => {
      await service.set('my-key', 'my-value');

      expect(mockRedisClient.set).toHaveBeenCalledWith('my-key', 'my-value');
      expect(mockRedisClient.setex).not.toHaveBeenCalled();
    });

    it('calls redis.setex when a TTL is provided', async () => {
      await service.set('my-key', 'my-value', 60);

      expect(mockRedisClient.setex).toHaveBeenCalledWith('my-key', 60, 'my-value');
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });

    it('does not throw when Redis throws (degraded mode)', async () => {
      mockRedisClient.set.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(service.set('k', 'v')).resolves.toBeUndefined();
    });
  });

  describe('get()', () => {
    it('returns the stored value', async () => {
      mockRedisClient.get.mockResolvedValueOnce('hello');

      const result = await service.get('my-key');

      expect(mockRedisClient.get).toHaveBeenCalledWith('my-key');
      expect(result).toBe('hello');
    });

    it('returns null when the key is missing', async () => {
      mockRedisClient.get.mockResolvedValueOnce(null);

      const result = await service.get('missing');

      expect(result).toBeNull();
    });

    it('returns null when Redis throws (degraded mode)', async () => {
      mockRedisClient.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await service.get('k');

      expect(result).toBeNull();
    });
  });

  describe('del()', () => {
    it('calls redis.del with the correct key', async () => {
      await service.del('my-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('my-key');
    });

    it('does not throw when Redis throws (degraded mode)', async () => {
      mockRedisClient.del.mockRejectedValueOnce(new Error('DEL failed'));

      await expect(service.del('k')).resolves.toBeUndefined();
    });
  });

  // ─── setJson / getJson ───────────────────────────────────────────────────────

  describe('setJson()', () => {
    it('serialises the value to JSON and delegates to set()', async () => {
      const payload = { userId: 'u1', role: 'DOCTOR' };
      await service.setJson('session:u1', payload, 3600);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'session:u1',
        3600,
        JSON.stringify(payload),
      );
    });
  });

  describe('getJson()', () => {
    it('deserialises a stored JSON string back to an object', async () => {
      const payload = { name: 'Alice', age: 30 };
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(payload));

      const result = await service.getJson<{ name: string; age: number }>('k');

      expect(result).toEqual(payload);
    });

    it('returns null when the key is missing', async () => {
      mockRedisClient.get.mockResolvedValueOnce(null);

      const result = await service.getJson('k');

      expect(result).toBeNull();
    });

    it('returns null when the stored string is not valid JSON', async () => {
      mockRedisClient.get.mockResolvedValueOnce('{invalid-json');

      const result = await service.getJson('k');

      expect(result).toBeNull();
    });
  });

  // ─── increment ───────────────────────────────────────────────────────────────

  describe('increment()', () => {
    it('increments the counter and sets the TTL on the first call (count === 1)', async () => {
      mockRedisClient.incr.mockResolvedValueOnce(1);

      const count = await service.increment('ratelimit:192.168.1.1', 60);

      expect(mockRedisClient.incr).toHaveBeenCalledWith('ratelimit:192.168.1.1');
      expect(mockRedisClient.expire).toHaveBeenCalledWith('ratelimit:192.168.1.1', 60);
      expect(count).toBe(1);
    });

    it('increments but does NOT reset TTL on subsequent calls (count > 1)', async () => {
      mockRedisClient.incr.mockResolvedValueOnce(5);

      const count = await service.increment('ratelimit:192.168.1.1', 60);

      expect(mockRedisClient.expire).not.toHaveBeenCalled();
      expect(count).toBe(5);
    });

    it('returns 0 (safe fallback) when Redis throws', async () => {
      mockRedisClient.incr.mockRejectedValueOnce(new Error('INCR failed'));

      const count = await service.increment('k', 60);

      expect(count).toBe(0);
    });
  });

  // ─── publish ─────────────────────────────────────────────────────────────────

  describe('publish()', () => {
    it('publishes a message to the correct channel', async () => {
      await service.publish('facility:abc', JSON.stringify({ event: 'queue:updated' }));

      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'facility:abc',
        JSON.stringify({ event: 'queue:updated' }),
      );
    });

    it('does not throw when Redis throws (degraded mode)', async () => {
      mockRedisClient.publish.mockRejectedValueOnce(new Error('PUBLISH failed'));

      await expect(service.publish('ch', 'msg')).resolves.toBeUndefined();
    });
  });

  // ─── isHealthy ───────────────────────────────────────────────────────────────

  describe('isHealthy()', () => {
    it('returns true when ping responds with "PONG"', async () => {
      mockRedisClient.ping.mockResolvedValueOnce('PONG');

      const healthy = await service.isHealthy();

      expect(healthy).toBe(true);
    });

    it('returns false when ping responds with an unexpected value', async () => {
      mockRedisClient.ping.mockResolvedValueOnce('ERR');

      const healthy = await service.isHealthy();

      expect(healthy).toBe(false);
    });

    it('returns false when Redis throws', async () => {
      mockRedisClient.ping.mockRejectedValueOnce(new Error('ETIMEDOUT'));

      const healthy = await service.isHealthy();

      expect(healthy).toBe(false);
    });
  });
});

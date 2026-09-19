import Redis from 'ioredis';
import { config } from './index';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

export const createRedisClient = (): Redis => {
  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = new Redis(config.redis.url, {
      password: config.redis.password,
      db: config.redis.db,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });

    redisClient.on('error', (error: Error) => {
      logger.error('❌ Redis connection error:', error);
    });

    redisClient.on('close', () => {
      logger.warn('⚠️ Redis connection closed');
    });

    return redisClient;
  } catch (error) {
    logger.error('❌ Failed to create Redis client:', error);
    throw error;
  }
};

export const getRedisClient = (): Redis | null => {
  return redisClient;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis disconnected');
  }
};

// Graceful shutdown
process.on('beforeExit', async () => {
  await disconnectRedis();
});

export default createRedisClient;

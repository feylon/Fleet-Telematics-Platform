import { Provider } from '@nestjs/common';
import Redis from 'ioredis';
import { PlatformEnv } from '@fleet/common';
import { ENV } from './env.provider';

export const REDIS = Symbol('REDIS');

export const redisProvider: Provider<Redis> = {
  provide: REDIS,
  inject: [ENV],
  useFactory: (env: PlatformEnv) => new Redis({ host: env.redis.host, port: env.redis.port, password: env.redis.password || undefined, maxRetriesPerRequest: 3 }),
};

import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { PlatformEnv } from '@fleet/common';
import { ENV, envProvider } from '../common/env.provider';

export const REDIS = Symbol('REDIS');

export const createRedis = (env: PlatformEnv): Redis =>
  new Redis({
    host: env.redis.host,
    port: env.redis.port,
    password: env.redis.password || undefined,
    lazyConnect: false,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });

@Global()
@Module({
  providers: [
    envProvider,
    {
      provide: REDIS,
      inject: [ENV],
      useFactory: (env: PlatformEnv) => createRedis(env),
    },
  ],
  exports: [REDIS, ENV],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}

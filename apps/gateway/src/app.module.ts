import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { loadEnv } from '@fleet/common';
import { buildDataSourceOptions } from '@fleet/database';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { MobileModule } from './sessions/mobile.module';
import { AuditModule } from './audit/audit.module';
import { BrandingModule } from './branding/branding.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';

const env = loadEnv('gateway');

@Module({
  imports: [
    TypeOrmModule.forRoot({ ...buildDataSourceOptions(env), migrationsRun: false }),
    ThrottlerModule.forRoot({ throttlers: [{ name: 'default', ttl: 60000, limit: 600 }] }),
    RedisModule,
    AuthModule,
    MobileModule,
    AuditModule,
    BrandingModule,
    OrganizationsModule,
    UsersModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

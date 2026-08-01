import { DataSource, DataSourceOptions } from 'typeorm';
import { PlatformEnv } from '@fleet/common';
import { ALL_ENTITIES } from './entities';
import { ALL_MIGRATIONS } from './migrations';

export const buildDataSourceOptions = (env: PlatformEnv): DataSourceOptions => ({
  type: 'postgres',
  host: env.postgres.host,
  port: env.postgres.port,
  username: env.postgres.user,
  password: env.postgres.password,
  database: env.postgres.database,
  ssl: env.postgres.ssl ? { rejectUnauthorized: false } : false,
  entities: ALL_ENTITIES,
  migrations: ALL_MIGRATIONS,
  synchronize: false,
  logging: ['error', 'warn'],
  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
  },
});

export const createDataSource = (env: PlatformEnv): DataSource => new DataSource(buildDataSourceOptions(env));

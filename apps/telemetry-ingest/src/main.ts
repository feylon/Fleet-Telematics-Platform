import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadEnv } from '@fleet/common';
import { AppModule } from './app.module';

const bootstrap = async () => {
  const env = loadEnv('telemetry-ingest');
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  await app.listen(env.httpPort, '0.0.0.0');
  Logger.log(`telemetry-ingest health on ${env.httpPort}`, 'Bootstrap');
};

bootstrap().catch((error) => {
  Logger.error(`telemetry-ingest failed to start: ${(error as Error).stack ?? String(error)}`, 'Bootstrap');
  process.exit(1);
});

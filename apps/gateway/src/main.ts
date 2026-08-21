import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { loadEnv, usesDefaultJwtSecrets } from '@fleet/common';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger';
import { DeviceModule } from './telemetry/device.module';
import { FleetModule } from './fleet/fleet.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { AnalyticsModule } from './analytics/analytics.module';

const bootstrap = async () => {
  const env = loadEnv('gateway');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false, bodyParser: false });
  app.set('trust proxy', env.trustProxy === 'false' ? false : env.trustProxy);
  app.use(json({ limit: env.bodyLimit }));
  app.use(urlencoded({ extended: true, limit: env.bodyLimit }));
  if (usesDefaultJwtSecrets(env)) Logger.warn('JWT_ACCESS_SECRET / JWT_REFRESH_SECRET are defaults or too short: set unique 64-byte secrets before exposing this deployment', 'Bootstrap');
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.enableCors({ origin: env.corsOrigins, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidUnknownValues: false }));
  app.enableShutdownHooks();
  setupSwagger(app, { mobileModules: [FleetModule, DispatchModule, AnalyticsModule], deviceModules: [DeviceModule] });
  await app.listen(env.httpPort, '0.0.0.0');
  Logger.log(`gateway listening on ${env.httpPort}`, 'Bootstrap');
};

bootstrap().catch((error) => {
  Logger.error(`gateway failed to start: ${(error as Error).stack ?? String(error)}`, 'Bootstrap');
  process.exit(1);
});

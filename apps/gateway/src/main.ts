import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { loadEnv } from '@fleet/common';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger';
import { DeviceModule } from './telemetry/device.module';
import { FleetModule } from './fleet/fleet.module';

const bootstrap = async () => {
  const env = loadEnv('gateway');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false });
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.enableCors({ origin: env.corsOrigins, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidUnknownValues: false }));
  app.enableShutdownHooks();
  setupSwagger(app, { mobileModules: [FleetModule], deviceModules: [DeviceModule] });
  await app.listen(env.httpPort, '0.0.0.0');
  Logger.log(`gateway listening on ${env.httpPort}`, 'Bootstrap');
};

bootstrap().catch((error) => {
  Logger.error(`gateway failed to start: ${(error as Error).stack ?? String(error)}`, 'Bootstrap');
  process.exit(1);
});

import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { grpcServerOptions, loadEnv } from '@fleet/common';
import { AppModule } from './app.module';

const bootstrap = async () => {
  const env = loadEnv('geofence-service');
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice(grpcServerOptions('geofence.v1', env.grpcUrl), { inheritAppConfig: true });
  app.enableShutdownHooks();
  await app.startAllMicroservices();
  await app.listen(env.httpPort, '0.0.0.0');
  Logger.log(`geofence-service gRPC on ${env.grpcUrl}, health on ${env.httpPort}`, 'Bootstrap');
};

bootstrap().catch((error) => {
  Logger.error(`geofence-service failed to start: ${(error as Error).stack ?? String(error)}`, 'Bootstrap');
  process.exit(1);
});

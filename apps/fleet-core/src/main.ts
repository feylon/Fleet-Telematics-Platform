import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { grpcServerOptions, loadEnv } from '@fleet/common';
import { AppModule } from './app.module';

const bootstrap = async () => {
  const env = loadEnv('fleet-core');
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice(grpcServerOptions('fleet.v1', env.grpcUrl), { inheritAppConfig: true });
  app.enableShutdownHooks();
  await app.startAllMicroservices();
  await app.listen(env.httpPort, '0.0.0.0');
  Logger.log(`fleet-core gRPC on ${env.grpcUrl}, health on ${env.httpPort}`, 'Bootstrap');
};

bootstrap().catch((error) => {
  Logger.error(`fleet-core failed to start: ${(error as Error).stack ?? String(error)}`, 'Bootstrap');
  process.exit(1);
});

import { Kafka, logLevel, Partitioners } from 'kafkajs';
import { PlatformEnv } from '../config/env';

export const createKafka = (env: PlatformEnv, clientIdSuffix = ''): Kafka =>
  new Kafka({
    clientId: `${env.kafka.clientId}${clientIdSuffix}`,
    brokers: env.kafka.brokers,
    logLevel: logLevel.WARN,
    retry: { initialRetryTime: 300, retries: 10, maxRetryTime: 30000 },
    connectionTimeout: 10000,
    requestTimeout: 30000,
  });

export const producerConfig = {
  allowAutoTopicCreation: false,
  createPartitioner: Partitioners.DefaultPartitioner,
  idempotent: false,
  maxInFlightRequests: 5,
};

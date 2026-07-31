const read = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (value !== undefined && value !== '') return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable ${key}`);
};

const readInt = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) throw new Error(`Environment variable ${key} must be an integer`);
  return parsed;
};

const readBool = (key: string, fallback: boolean): boolean => {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
};

const readList = (key: string, fallback: string[]): string[] => {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  return raw.split(',').map((item) => item.trim()).filter(Boolean);
};

export interface PlatformEnv {
  nodeEnv: string;
  serviceName: string;
  httpPort: number;
  grpcUrl: string;
  postgres: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    ssl: boolean;
  };
  redis: {
    host: string;
    port: number;
    password: string;
  };
  kafka: {
    brokers: string[];
    clientId: string;
  };
  clickhouse: {
    url: string;
    user: string;
    password: string;
    database: string;
  };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtlSeconds: number;
    refreshTtlSeconds: number;
  };
  services: {
    fleetCoreGrpc: string;
    geofenceGrpc: string;
    dispatchGrpc: string;
    analyticsGrpc: string;
  };
  corsOrigins: string[];
  telegramBotToken: string;
  telegramChatId: string;
  reportsDir: string;
  ingestBatchSize: number;
  ingestBatchMs: number;
}

export const loadEnv = (serviceName: string): PlatformEnv => ({
  nodeEnv: read('NODE_ENV', 'production'),
  serviceName,
  httpPort: readInt('HTTP_PORT', 3001),
  grpcUrl: read('GRPC_URL', '0.0.0.0:50051'),
  postgres: {
    host: read('POSTGRES_HOST', 'postgres'),
    port: readInt('POSTGRES_PORT', 5432),
    user: read('POSTGRES_USER', 'fleet'),
    password: read('POSTGRES_PASSWORD', 'fleet'),
    database: read('POSTGRES_DB', 'fleet'),
    ssl: readBool('POSTGRES_SSL', false),
  },
  redis: {
    host: read('REDIS_HOST', 'redis'),
    port: readInt('REDIS_PORT', 6379),
    password: read('REDIS_PASSWORD', ''),
  },
  kafka: {
    brokers: readList('KAFKA_BROKERS', ['kafka:9092']),
    clientId: read('KAFKA_CLIENT_ID', serviceName),
  },
  clickhouse: {
    url: read('CLICKHOUSE_URL', 'http://clickhouse:8123'),
    user: read('CLICKHOUSE_USER', 'default'),
    password: read('CLICKHOUSE_PASSWORD', ''),
    database: read('CLICKHOUSE_DB', 'fleet'),
  },
  jwt: {
    accessSecret: read('JWT_ACCESS_SECRET', 'change-me-access'),
    refreshSecret: read('JWT_REFRESH_SECRET', 'change-me-refresh'),
    accessTtlSeconds: readInt('JWT_ACCESS_TTL', 900),
    refreshTtlSeconds: readInt('JWT_REFRESH_TTL', 604800),
  },
  services: {
    fleetCoreGrpc: read('FLEET_CORE_GRPC_URL', 'fleet-core:50051'),
    geofenceGrpc: read('GEOFENCE_GRPC_URL', 'geofence-service:50052'),
    dispatchGrpc: read('DISPATCH_GRPC_URL', 'dispatch-order:50053'),
    analyticsGrpc: read('ANALYTICS_GRPC_URL', 'analytics:50054'),
  },
  corsOrigins: readList('CORS_ORIGINS', ['http://localhost:3000']),
  telegramBotToken: read('TELEGRAM_BOT_TOKEN', ''),
  telegramChatId: read('TELEGRAM_CHAT_ID', ''),
  reportsDir: read('REPORTS_DIR', '/data/reports'),
  ingestBatchSize: readInt('INGEST_BATCH_SIZE', 1000),
  ingestBatchMs: readInt('INGEST_BATCH_MS', 1000),
});

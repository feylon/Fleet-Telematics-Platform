import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { AlertMessage, PlatformEnv, TelemetryMessage, toClickHouseDateTime } from '@fleet/common';
import { ENV } from '../common/env.provider';

export interface TelemetryRow {
  timestamp: string;
  organization_id: string;
  vehicle_id: string;
  imei: string;
  latitude: number;
  longitude: number;
  speed: number;
  altitude: number;
  heading: number;
  fuel_level: number;
  engine_temp: number;
  ignition_on: number;
  is_moving: number;
  sos: number;
}

export interface AlertRow {
  timestamp: string;
  organization_id: string;
  vehicle_id: string;
  alert_type: string;
  severity: string;
  details: string;
  latitude: number;
  longitude: number;
  geofence_id: string;
  order_id: string;
}

export const toTelemetryRow = (message: TelemetryMessage): TelemetryRow => ({
  timestamp: toClickHouseDateTime(message.timestamp),
  organization_id: message.organizationId,
  vehicle_id: message.vehicleId,
  imei: message.imei,
  latitude: message.latitude,
  longitude: message.longitude,
  speed: message.speed,
  altitude: message.altitude,
  heading: message.heading,
  fuel_level: message.fuelLevel,
  engine_temp: message.engineTemp,
  ignition_on: message.ignitionOn ? 1 : 0,
  is_moving: message.isMoving ? 1 : 0,
  sos: message.sos ? 1 : 0,
});

export const toAlertRow = (alert: AlertMessage): AlertRow => ({
  timestamp: toClickHouseDateTime(alert.timestamp),
  organization_id: alert.organizationId,
  vehicle_id: alert.vehicleId,
  alert_type: alert.alertType,
  severity: alert.severity,
  details: alert.details.slice(0, 2000),
  latitude: alert.latitude,
  longitude: alert.longitude,
  geofence_id: alert.geofenceId ?? '',
  order_id: alert.orderId ?? '',
});

@Injectable()
export class ClickHouseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClickHouseService.name);
  private readonly client: ClickHouseClient;

  constructor(@Inject(ENV) private readonly env: PlatformEnv) {
    this.client = createClient({
      url: env.clickhouse.url,
      username: env.clickhouse.user,
      password: env.clickhouse.password,
      database: env.clickhouse.database,
      request_timeout: 30000,
      max_open_connections: 10,
      compression: { request: true, response: false },
      clickhouse_settings: { async_insert: 0, date_time_input_format: 'best_effort' },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.waitForReady();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }

  async insertTelemetry(rows: TelemetryRow[]): Promise<void> {
    if (rows.length === 0) return;
    await this.client.insert({ table: 'vehicle_telemetry', values: rows, format: 'JSONEachRow' });
  }

  async insertAlerts(rows: AlertRow[]): Promise<void> {
    if (rows.length === 0) return;
    await this.client.insert({ table: 'telemetry_alerts', values: rows, format: 'JSONEachRow' });
  }

  async ping(): Promise<boolean> {
    const result = await this.client.ping();
    return result.success;
  }

  private async waitForReady(): Promise<void> {
    for (let attempt = 1; attempt <= 30; attempt++) {
      try {
        const result = await this.client.query({ query: 'SELECT count() AS c FROM vehicle_telemetry LIMIT 1', format: 'JSONEachRow' });
        await result.json();
        this.logger.log('clickhouse ready');
        return;
      } catch (error) {
        this.logger.warn(`clickhouse not ready (attempt ${attempt}): ${(error as Error).message}`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    throw new Error('ClickHouse did not become ready');
  }
}

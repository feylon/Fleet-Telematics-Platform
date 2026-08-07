import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { toClickHouseDateTime } from '@fleet/common';
import { Organization } from '@fleet/database';
import { ClickHouseService } from '../clickhouse/clickhouse.service';
import { MetricsService, parseRange, Range } from '../metrics/metrics.service';

export const dayBounds = (day: string): { from: string; to: string } => {
  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  return { from: start.toISOString(), to: end.toISOString() };
};

export const daysBetween = (from: string, to: string): string[] => {
  const days: string[] = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  while (cursor < end && days.length < 400) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
};

@Injectable()
export class RollupsService {
  private readonly logger = new Logger(RollupsService.name);

  constructor(private readonly clickhouse: ClickHouseService, private readonly metrics: MetricsService, @InjectRepository(Organization) private readonly organizations: Repository<Organization>) {}

  async computeDay(organizationId: string, day: string): Promise<number> {
    const bounds = dayBounds(day);
    const aggregates = await this.metrics.perVehicle({ organizationId, ...bounds });
    if (aggregates.length === 0) return 0;
    const params = parseRange({ organizationId, ...bounds });
    const alertRows = await this.clickhouse.rows<{ vehicle_id: string; harsh: number; speeding: number }>(
      `SELECT vehicle_id, countIf(alert_type = 'HARSH_BRAKE') AS harsh, countIf(alert_type = 'SPEEDING') AS speeding FROM telemetry_alerts WHERE organization_id = {organizationId:UUID} AND timestamp >= {from:DateTime64(3)} AND timestamp < {to:DateTime64(3)} GROUP BY vehicle_id`,
      params,
    );
    const alertsByVehicle = new Map(alertRows.map((row) => [row.vehicle_id, row]));
    const capacities = await this.metrics.tankCapacities(organizationId, aggregates.map((row) => row.vehicle_id));
    const computedAt = toClickHouseDateTime(new Date().toISOString());
    await this.clickhouse.insert(
      'vehicle_daily_rollup',
      aggregates.map((row) => ({
        day,
        organization_id: organizationId,
        vehicle_id: row.vehicle_id,
        mileage_km: Number(row.mileage_km),
        moving_seconds: Math.round(Number(row.moving_seconds)),
        idle_seconds: Math.round(Number(row.idle_seconds)),
        max_speed: Number(row.max_speed),
        avg_speed: Number(row.avg_speed || 0),
        fuel_consumed: Number(((Number(row.fuel_drop_points) / 100) * (capacities.get(row.vehicle_id) ?? 0)).toFixed(2)),
        harsh_events: Number(alertsByVehicle.get(row.vehicle_id)?.harsh ?? 0),
        speeding_events: Number(alertsByVehicle.get(row.vehicle_id)?.speeding ?? 0),
        pings: Number(row.pings),
        computed_at: computedAt,
      })),
    );
    return aggregates.length;
  }

  async runRange(range: Range) {
    const parsed = parseRange(range);
    let written = 0;
    for (const day of daysBetween(`${parsed.from.replace(' ', 'T')}Z`, `${parsed.to.replace(' ', 'T')}Z`)) {
      written += await this.computeDay(range.organizationId, day);
    }
    this.logger.log(`rollup for ${range.organizationId}: ${written} vehicle-days`);
    return this.list(range);
  }

  async runNightly(): Promise<void> {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const day = yesterday.toISOString().slice(0, 10);
    const organizations = await this.organizations.find({ where: { isActive: true } });
    for (const organization of organizations) {
      try {
        const count = await this.computeDay(organization.id, day);
        this.logger.log(`nightly rollup ${day} for ${organization.slug}: ${count} vehicles`);
      } catch (error) {
        this.logger.error(`nightly rollup failed for ${organization.slug}: ${(error as Error).message}`);
      }
    }
  }

  async list(range: Range) {
    const params = parseRange(range);
    const rows = await this.clickhouse.rows<Record<string, unknown>>(
      `SELECT day, vehicle_id, mileage_km, moving_seconds, idle_seconds, max_speed, fuel_consumed, harsh_events, speeding_events FROM vehicle_daily_rollup FINAL WHERE organization_id = {organizationId:UUID} AND day >= toDate({from:DateTime64(3)}) AND day <= toDate({to:DateTime64(3)}) ORDER BY day, vehicle_id`,
      params,
    );
    return {
      items: rows.map((row) => ({ day: String(row.day), vehicleId: String(row.vehicle_id), mileageKm: Number(row.mileage_km), movingSeconds: Number(row.moving_seconds), idleSeconds: Number(row.idle_seconds), maxSpeed: Number(row.max_speed), fuelConsumed: Number(row.fuel_consumed), harshEvents: Number(row.harsh_events), speedingEvents: Number(row.speeding_events) })),
    };
  }
}

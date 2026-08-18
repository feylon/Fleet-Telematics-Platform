import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { rpcInvalid, toClickHouseDateTime } from '@fleet/common';
import { Driver, Vehicle } from '@fleet/database';
import { ClickHouseService } from '../clickhouse/clickhouse.service';
import { ecoScore } from './eco-score';

export const MAX_RANGE_MS = 92 * 24 * 3600 * 1000;

export interface Range {
  organizationId: string;
  from: string;
  to: string;
}

export const parseRange = (range: Range): { organizationId: string; from: string; to: string } => {
  if (!range.organizationId) throw rpcInvalid('organizationId is required');
  const to = range.to ? new Date(range.to) : new Date();
  const from = range.from ? new Date(range.from) : new Date(to.getTime() - 24 * 3600 * 1000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) throw rpcInvalid('Invalid time range');
  if (to.getTime() - from.getTime() > MAX_RANGE_MS) throw rpcInvalid('Time range may not exceed 92 days');
  return { organizationId: range.organizationId, from: toClickHouseDateTime(from.toISOString()), to: toClickHouseDateTime(to.toISOString()) };
};

const STEP_SQL = `if(pts = toDateTime64('1970-01-01 00:00:00.000', 3, 'UTC') OR dateDiff('second', pts, timestamp) > 300, 0, least(geoDistance(plon, plat, longitude, latitude), 5000))`;
const GAP_SQL = `if(pts = toDateTime64('1970-01-01 00:00:00.000', 3, 'UTC'), 0, least(dateDiff('second', pts, timestamp), 300))`;

const stepsCte = (extraWhere = '') => `
  WITH steps AS (
    SELECT vehicle_id, timestamp, latitude, longitude, speed, fuel_level, engine_temp, is_moving, ignition_on,
      lagInFrame(latitude) OVER w AS plat,
      lagInFrame(longitude) OVER w AS plon,
      lagInFrame(timestamp) OVER w AS pts,
      lagInFrame(fuel_level) OVER w AS pfuel
    FROM vehicle_telemetry
    WHERE organization_id = {organizationId:UUID} AND timestamp >= {from:DateTime64(3)} AND timestamp < {to:DateTime64(3)} ${extraWhere}
    WINDOW w AS (PARTITION BY vehicle_id ORDER BY timestamp ROWS BETWEEN 1 PRECEDING AND CURRENT ROW)
  )`;

export interface VehicleAggregate {
  vehicle_id: string;
  mileage_km: number;
  moving_seconds: number;
  idle_seconds: number;
  max_speed: number;
  avg_speed: number;
  fuel_drop_points: number;
  over_rev_events: number;
  pings: number;
}

@Injectable()
export class MetricsService {
  constructor(
    private readonly clickhouse: ClickHouseService,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(Driver) private readonly drivers: Repository<Driver>,
  ) {}

  async perVehicle(range: Range, vehicleId?: string): Promise<VehicleAggregate[]> {
    const params = parseRange(range);
    const extra = vehicleId ? 'AND vehicle_id = {vehicleId:UUID}' : '';
    return this.clickhouse.rows<VehicleAggregate>(
      `${stepsCte(extra)}
      SELECT vehicle_id,
        sum(${STEP_SQL}) / 1000 AS mileage_km,
        sumIf(${GAP_SQL}, is_moving = 1) AS moving_seconds,
        sumIf(${GAP_SQL}, is_moving = 0 AND ignition_on = 1) AS idle_seconds,
        max(speed) AS max_speed,
        avgIf(speed, is_moving = 1) AS avg_speed,
        sumIf(pfuel - fuel_level, pfuel > fuel_level AND is_moving = 1 AND pfuel - fuel_level < 15) AS fuel_drop_points,
        countIf(engine_temp > 105) AS over_rev_events,
        count() AS pings
      FROM steps GROUP BY vehicle_id`,
      { ...params, ...(vehicleId ? { vehicleId } : {}) },
    );
  }

  async summary(range: Range) {
    const params = parseRange(range);
    const aggregates = await this.perVehicle(range);
    const alerts = await this.clickhouse.one<{ alerts: number }>(`SELECT count() AS alerts FROM telemetry_alerts WHERE organization_id = {organizationId:UUID} AND timestamp >= {from:DateTime64(3)} AND timestamp < {to:DateTime64(3)}`, params);
    const capacities = await this.tankCapacities(range.organizationId, aggregates.map((row) => row.vehicle_id));
    const fuel = aggregates.reduce((sum, row) => sum + (Number(row.fuel_drop_points) / 100) * (capacities.get(row.vehicle_id) ?? 0), 0);
    const pings = aggregates.reduce((sum, row) => sum + Number(row.pings), 0);
    const avgSpeed = aggregates.length ? aggregates.reduce((sum, row) => sum + Number(row.avg_speed || 0), 0) / aggregates.length : 0;
    return {
      totalMileageKm: Number(aggregates.reduce((sum, row) => sum + Number(row.mileage_km), 0).toFixed(2)),
      totalFuelConsumed: Number(fuel.toFixed(2)),
      avgSpeed: Number(avgSpeed.toFixed(1)),
      maxSpeed: aggregates.reduce((max, row) => Math.max(max, Number(row.max_speed)), 0),
      movingSeconds: aggregates.reduce((sum, row) => sum + Number(row.moving_seconds), 0),
      idleSeconds: aggregates.reduce((sum, row) => sum + Number(row.idle_seconds), 0),
      pings,
      alerts: Number(alerts?.alerts ?? 0),
      activeVehicles: aggregates.length,
    };
  }

  async vehicleSeries(request: Range & { vehicleId: string; bucketSeconds: number }) {
    const params = parseRange(request);
    if (!request.vehicleId) throw rpcInvalid('vehicleId is required');
    const bucket = request.bucketSeconds > 0 ? Math.min(3600, request.bucketSeconds) : 60;
    const points = await this.clickhouse.rows<Record<string, unknown>>(
      `SELECT toStartOfInterval(timestamp, INTERVAL {bucket:UInt32} SECOND) AS ts,
        avg(speed) AS speed, avg(fuel_level) AS fuel_level, avg(engine_temp) AS engine_temp,
        argMax(latitude, timestamp) AS latitude, argMax(longitude, timestamp) AS longitude, argMax(heading, timestamp) AS heading, max(is_moving) AS is_moving
      FROM vehicle_telemetry
      WHERE organization_id = {organizationId:UUID} AND vehicle_id = {vehicleId:UUID} AND timestamp >= {from:DateTime64(3)} AND timestamp < {to:DateTime64(3)}
      GROUP BY ts ORDER BY ts LIMIT 5000`,
      { ...params, vehicleId: request.vehicleId, bucket },
    );
    return { points: points.map((row) => ({ timestamp: `${String(row.ts).replace(' ', 'T')}Z`, speed: Number(row.speed), fuelLevel: Number(row.fuel_level), engineTemp: Number(row.engine_temp), latitude: Number(row.latitude), longitude: Number(row.longitude), heading: Number(row.heading), isMoving: Number(row.is_moving) === 1 })) };
  }

  async track(request: Range & { vehicleId: string; limit: number }) {
    const params = parseRange(request);
    if (!request.vehicleId) throw rpcInvalid('vehicleId is required');
    const limit = request.limit > 0 ? Math.min(20000, request.limit) : 5000;
    const points = await this.clickhouse.rows<Record<string, unknown>>(
      `SELECT timestamp AS ts, speed, fuel_level, engine_temp, latitude, longitude, heading, is_moving
      FROM vehicle_telemetry
      WHERE organization_id = {organizationId:UUID} AND vehicle_id = {vehicleId:UUID} AND timestamp >= {from:DateTime64(3)} AND timestamp < {to:DateTime64(3)}
      ORDER BY timestamp LIMIT {limit:UInt32}`,
      { ...params, vehicleId: request.vehicleId, limit },
    );
    return { points: points.map((row) => ({ timestamp: `${String(row.ts).replace(' ', 'T')}Z`, speed: Number(row.speed), fuelLevel: Number(row.fuel_level), engineTemp: Number(row.engine_temp), latitude: Number(row.latitude), longitude: Number(row.longitude), heading: Number(row.heading), isMoving: Number(row.is_moving) === 1 })) };
  }

  async driverScores(request: Range & { vehicleId?: string }) {
    const params = parseRange(request);
    const aggregates = await this.perVehicle(request, request.vehicleId || undefined);
    const alertRows = await this.clickhouse.rows<{ vehicle_id: string; harsh: number; speeding: number }>(
      `SELECT vehicle_id, countIf(alert_type = 'HARSH_BRAKE') AS harsh, countIf(alert_type = 'SPEEDING') AS speeding
      FROM telemetry_alerts WHERE organization_id = {organizationId:UUID} AND timestamp >= {from:DateTime64(3)} AND timestamp < {to:DateTime64(3)} GROUP BY vehicle_id`,
      params,
    );
    const alertsByVehicle = new Map(alertRows.map((row) => [row.vehicle_id, row]));
    const ids = aggregates.map((row) => row.vehicle_id);
    const [vehicles, drivers] = await Promise.all([
      ids.length ? this.vehicles.find({ where: { id: In(ids), organizationId: request.organizationId } }) : [],
      ids.length ? this.drivers.find({ where: { vehicleId: In(ids), organizationId: request.organizationId } }) : [],
    ]);
    const plates = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle.plateNumber]));
    const driverByVehicle = new Map(drivers.map((driver) => [driver.vehicleId, driver]));
    const items = aggregates.map((row) => {
      const alerts = alertsByVehicle.get(row.vehicle_id);
      const stats = { mileageKm: Number(row.mileage_km), harshBrakes: Number(alerts?.harsh ?? 0), speedingEvents: Number(alerts?.speeding ?? 0), overRevEvents: Number(row.over_rev_events) };
      const driver = driverByVehicle.get(row.vehicle_id);
      return { vehicleId: row.vehicle_id, driverId: driver?.id ?? '', driverName: driver?.fullName ?? '', plateNumber: plates.get(row.vehicle_id) ?? '', mileageKm: Number(stats.mileageKm.toFixed(2)), harshBrakes: stats.harshBrakes, speedingEvents: stats.speedingEvents, overRevEvents: stats.overRevEvents, score: ecoScore(stats) };
    });
    return { items: items.sort((a, b) => b.score - a.score) };
  }

  async alerts(request: Range & { vehicleId?: string; alertType?: string; severity?: string; pagination?: { page?: number; pageSize?: number } }) {
    const params = parseRange(request);
    const page = Math.max(1, request.pagination?.page ?? 1);
    const pageSize = Math.min(500, Math.max(1, request.pagination?.pageSize ?? 50));
    const filters: string[] = [];
    const extra: Record<string, unknown> = {};
    if (request.vehicleId) {
      filters.push('AND vehicle_id = {vehicleId:UUID}');
      extra.vehicleId = request.vehicleId;
    }
    if (request.alertType) {
      filters.push('AND alert_type = {alertType:String}');
      extra.alertType = request.alertType;
    }
    if (request.severity) {
      filters.push('AND severity = {severity:String}');
      extra.severity = request.severity;
    }
    const where = `WHERE organization_id = {organizationId:UUID} AND timestamp >= {from:DateTime64(3)} AND timestamp < {to:DateTime64(3)} ${filters.join(' ')}`;
    const [rows, total] = await Promise.all([
      this.clickhouse.rows<Record<string, unknown>>(`SELECT timestamp AS ts, vehicle_id, alert_type, severity, details, latitude, longitude FROM telemetry_alerts ${where} ORDER BY timestamp DESC LIMIT {limit:UInt32} OFFSET {offset:UInt32}`, { ...params, ...extra, limit: pageSize, offset: (page - 1) * pageSize }),
      this.clickhouse.one<{ total: number }>(`SELECT count() AS total FROM telemetry_alerts ${where}`, { ...params, ...extra }),
    ]);
    return { items: rows.map((row) => ({ timestamp: `${String(row.ts).replace(' ', 'T')}Z`, vehicleId: String(row.vehicle_id), alertType: String(row.alert_type), severity: String(row.severity), details: String(row.details), latitude: Number(row.latitude), longitude: Number(row.longitude) })), meta: { page, pageSize, total: Number(total?.total ?? 0) } };
  }

  async alertStats(range: Range) {
    const params = parseRange(range);
    const rows = await this.clickhouse.rows<{ alert_type: string; count: number }>(`SELECT alert_type, count() AS count FROM telemetry_alerts WHERE organization_id = {organizationId:UUID} AND timestamp >= {from:DateTime64(3)} AND timestamp < {to:DateTime64(3)} GROUP BY alert_type ORDER BY count DESC`, params);
    return { items: rows.map((row) => ({ alertType: row.alert_type, count: Number(row.count) })) };
  }

  async heatmap(request: Range & { precision: number }) {
    const params = parseRange(request);
    const precision = request.precision > 0 ? Math.min(5, request.precision) : 3;
    const rows = await this.clickhouse.rows<{ lat: number; lon: number; weight: number }>(
      `SELECT round(latitude, {precision:UInt8}) AS lat, round(longitude, {precision:UInt8}) AS lon, count() AS weight FROM vehicle_telemetry WHERE organization_id = {organizationId:UUID} AND timestamp >= {from:DateTime64(3)} AND timestamp < {to:DateTime64(3)} GROUP BY lat, lon ORDER BY weight DESC LIMIT 5000`,
      { ...params, precision },
    );
    return { cells: rows.map((row) => ({ latitude: Number(row.lat), longitude: Number(row.lon), weight: Number(row.weight) })) };
  }

  async ingestStats() {
    const telemetry = await this.clickhouse.one<Record<string, unknown>>(`SELECT countIf(timestamp >= now() - INTERVAL 1 MINUTE) AS last_minute, countIf(timestamp >= now() - INTERVAL 1 HOUR) AS last_hour, count() AS total, max(timestamp) AS latest FROM vehicle_telemetry`);
    const alerts = await this.clickhouse.one<Record<string, unknown>>(`SELECT countIf(timestamp >= now() - INTERVAL 1 HOUR) AS last_hour FROM telemetry_alerts`);
    return { rowsLastMinute: Number(telemetry?.last_minute ?? 0), rowsLastHour: Number(telemetry?.last_hour ?? 0), alertsLastHour: Number(alerts?.last_hour ?? 0), totalRows: Number(telemetry?.total ?? 0), latestTimestamp: String(telemetry?.latest ?? '') };
  }

  async tankCapacities(organizationId: string, vehicleIds: string[]): Promise<Map<string, number>> {
    if (vehicleIds.length === 0) return new Map();
    const vehicles = await this.vehicles.find({ where: { id: In(vehicleIds), organizationId } });
    return new Map(vehicles.map((vehicle) => [vehicle.id, vehicle.fuelTankCapacity ?? 0]));
  }

  async plates(organizationId: string, vehicleIds: string[]): Promise<Map<string, string>> {
    if (vehicleIds.length === 0) return new Map();
    const vehicles = await this.vehicles.find({ where: { id: In(vehicleIds), organizationId } });
    return new Map(vehicles.map((vehicle) => [vehicle.id, vehicle.plateNumber]));
  }
}

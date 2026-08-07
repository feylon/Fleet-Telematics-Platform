import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Driver } from '@fleet/database';
import { MetricsService } from '../metrics/metrics.service';
import { RollupsService } from '../rollups/rollups.service';
import { label, Locale } from './report-labels';
import { buildHeader, hoursOf, ReportTable } from './report-table';
import { ReportRecord } from './report.store';

@Injectable()
export class ReportGenerator {
  constructor(private readonly metrics: MetricsService, private readonly rollups: RollupsService, @InjectRepository(Driver) private readonly drivers: Repository<Driver>) {}

  async build(record: ReportRecord): Promise<ReportTable> {
    const locale: Locale = record.locale;
    const header = buildHeader(locale, record.reportType, record.from, record.to, new Date());
    const range = { organizationId: record.organizationId, from: record.from, to: record.to };
    switch (record.reportType) {
      case 'DRIVER_SCORES': {
        const { items } = await this.metrics.driverScores(range);
        return {
          ...header,
          columns: [
            { key: 'plate', labelKey: 'plate', width: 14 },
            { key: 'driver', labelKey: 'driver', width: 24 },
            { key: 'mileageKm', labelKey: 'mileageKm', width: 14, align: 'right' },
            { key: 'harshBrakes', labelKey: 'harshBrakes', width: 12, align: 'right' },
            { key: 'speeding', labelKey: 'speeding', width: 12, align: 'right' },
            { key: 'overRev', labelKey: 'overRev', width: 12, align: 'right' },
            { key: 'score', labelKey: 'score', width: 10, align: 'right' },
          ],
          rows: items.map((item) => ({ plate: item.plateNumber, driver: item.driverName, mileageKm: item.mileageKm, harshBrakes: item.harshBrakes, speeding: item.speedingEvents, overRev: item.overRevEvents, score: item.score })),
        };
      }
      case 'ALERTS': {
        const { items } = await this.metrics.alerts({ ...range, vehicleId: record.vehicleId || undefined, pagination: { page: 1, pageSize: 500 } });
        const plates = await this.metrics.plates(record.organizationId, [...new Set(items.map((item) => item.vehicleId))]);
        return {
          ...header,
          columns: [
            { key: 'time', labelKey: 'time', width: 20 },
            { key: 'plate', labelKey: 'plate', width: 14 },
            { key: 'alertType', labelKey: 'alertType', width: 20 },
            { key: 'severity', labelKey: 'severity', width: 12 },
            { key: 'details', labelKey: 'details', width: 44 },
          ],
          rows: items.map((item) => ({ time: item.timestamp.slice(0, 19).replace('T', ' '), plate: plates.get(item.vehicleId) ?? item.vehicleId.slice(0, 8), alertType: item.alertType, severity: item.severity, details: item.details })),
          summary: [[label(locale, 'total'), items.length]],
        };
      }
      case 'VEHICLE_TRACK': {
        const { points } = await this.metrics.track({ ...range, vehicleId: record.vehicleId, limit: 5000 });
        const plates = await this.metrics.plates(record.organizationId, [record.vehicleId]);
        return {
          ...header,
          subtitle: `${plates.get(record.vehicleId) ?? ''} · ${header.subtitle}`,
          columns: [
            { key: 'time', labelKey: 'time', width: 20 },
            { key: 'latitude', labelKey: 'latitude', width: 12, align: 'right' },
            { key: 'longitude', labelKey: 'longitude', width: 12, align: 'right' },
            { key: 'speed', labelKey: 'speed', width: 10, align: 'right' },
            { key: 'fuelLevel', labelKey: 'fuelLevel', width: 12, align: 'right' },
            { key: 'engineTemp', labelKey: 'engineTemp', width: 12, align: 'right' },
          ],
          rows: points.map((point) => ({ time: point.timestamp.slice(0, 19).replace('T', ' '), latitude: point.latitude.toFixed(5), longitude: point.longitude.toFixed(5), speed: point.speed.toFixed(1), fuelLevel: point.fuelLevel.toFixed(1), engineTemp: point.engineTemp.toFixed(0) })),
        };
      }
      case 'DAILY_ROLLUP': {
        const { items } = await this.rollups.list(range);
        const plates = await this.metrics.plates(record.organizationId, [...new Set(items.map((item) => item.vehicleId))]);
        return {
          ...header,
          columns: [
            { key: 'day', labelKey: 'day', width: 12 },
            { key: 'plate', labelKey: 'plate', width: 14 },
            { key: 'mileageKm', labelKey: 'mileageKm', width: 14, align: 'right' },
            { key: 'movingHours', labelKey: 'movingHours', width: 12, align: 'right' },
            { key: 'idleHours', labelKey: 'idleHours', width: 12, align: 'right' },
            { key: 'maxSpeed', labelKey: 'maxSpeed', width: 12, align: 'right' },
            { key: 'fuelConsumed', labelKey: 'fuelConsumed', width: 14, align: 'right' },
            { key: 'harshBrakes', labelKey: 'harshBrakes', width: 12, align: 'right' },
            { key: 'speeding', labelKey: 'speeding', width: 12, align: 'right' },
          ],
          rows: items.map((item) => ({ day: item.day, plate: plates.get(item.vehicleId) ?? '', mileageKm: item.mileageKm.toFixed(1), movingHours: hoursOf(item.movingSeconds), idleHours: hoursOf(item.idleSeconds), maxSpeed: item.maxSpeed.toFixed(0), fuelConsumed: item.fuelConsumed.toFixed(1), harshBrakes: item.harshEvents, speeding: item.speedingEvents })),
        };
      }
      default: {
        const aggregates = await this.metrics.perVehicle(range);
        const ids = aggregates.map((row) => row.vehicle_id);
        const [plates, capacities, drivers] = await Promise.all([this.metrics.plates(record.organizationId, ids), this.metrics.tankCapacities(record.organizationId, ids), ids.length ? this.drivers.find({ where: { vehicleId: In(ids) } }) : []]);
        const driverByVehicle = new Map(drivers.map((driver) => [driver.vehicleId, driver.fullName]));
        const rows = aggregates.map((row) => ({
          plate: plates.get(row.vehicle_id) ?? row.vehicle_id.slice(0, 8),
          driver: driverByVehicle.get(row.vehicle_id) ?? '',
          mileageKm: Number(row.mileage_km).toFixed(1),
          movingHours: hoursOf(Number(row.moving_seconds)),
          idleHours: hoursOf(Number(row.idle_seconds)),
          maxSpeed: Number(row.max_speed).toFixed(0),
          avgSpeed: Number(row.avg_speed || 0).toFixed(1),
          fuelConsumed: ((Number(row.fuel_drop_points) / 100) * (capacities.get(row.vehicle_id) ?? 0)).toFixed(1),
        }));
        const totalKm = aggregates.reduce((sum, row) => sum + Number(row.mileage_km), 0);
        return {
          ...header,
          columns: [
            { key: 'plate', labelKey: 'plate', width: 14 },
            { key: 'driver', labelKey: 'driver', width: 22 },
            { key: 'mileageKm', labelKey: 'mileageKm', width: 14, align: 'right' },
            { key: 'movingHours', labelKey: 'movingHours', width: 12, align: 'right' },
            { key: 'idleHours', labelKey: 'idleHours', width: 12, align: 'right' },
            { key: 'maxSpeed', labelKey: 'maxSpeed', width: 12, align: 'right' },
            { key: 'avgSpeed', labelKey: 'avgSpeed', width: 12, align: 'right' },
            { key: 'fuelConsumed', labelKey: 'fuelConsumed', width: 14, align: 'right' },
          ],
          rows,
          summary: [[label(locale, 'activeVehicles'), aggregates.length], [label(locale, 'mileageKm'), totalKm.toFixed(1)]],
        };
      }
    }
  }
}

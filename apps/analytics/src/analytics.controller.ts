import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { MetricsService, Range } from './metrics/metrics.service';
import { RollupsService } from './rollups/rollups.service';
import { ReportsService } from './reports/reports.service';

@Controller()
export class AnalyticsController {
  constructor(private readonly metrics: MetricsService, private readonly rollups: RollupsService, private readonly reports: ReportsService) {}

  @GrpcMethod('AnalyticsService', 'Summary')
  summary(range: Range) {
    return this.metrics.summary(range);
  }

  @GrpcMethod('AnalyticsService', 'VehicleSeries')
  vehicleSeries(request: Range & { vehicleId: string; bucketSeconds: number }) {
    return this.metrics.vehicleSeries(request);
  }

  @GrpcMethod('AnalyticsService', 'Track')
  track(request: Range & { vehicleId: string; limit: number }) {
    return this.metrics.track(request);
  }

  @GrpcMethod('AnalyticsService', 'DriverScores')
  driverScores(request: Range & { vehicleId?: string }) {
    return this.metrics.driverScores(request);
  }

  @GrpcMethod('AnalyticsService', 'DailyRollups')
  dailyRollups(range: Range) {
    return this.rollups.list(range);
  }

  @GrpcMethod('AnalyticsService', 'RunRollup')
  runRollup(range: Range) {
    return this.rollups.runRange(range);
  }

  @GrpcMethod('AnalyticsService', 'Alerts')
  alerts(request: Range & { vehicleId?: string; alertType?: string; severity?: string; pagination?: { page?: number; pageSize?: number } }) {
    return this.metrics.alerts(request);
  }

  @GrpcMethod('AnalyticsService', 'AlertStats')
  alertStats(range: Range) {
    return this.metrics.alertStats(range);
  }

  @GrpcMethod('AnalyticsService', 'Heatmap')
  heatmap(request: Range & { precision: number }) {
    return this.metrics.heatmap(request);
  }

  @GrpcMethod('AnalyticsService', 'RequestReport')
  requestReport(request: { organizationId: string; reportType: string; format: string; from: string; to: string; locale: string; requestedBy: string; vehicleId: string }) {
    return this.reports.request(request);
  }

  @GrpcMethod('AnalyticsService', 'ListReports')
  listReports(request: { organizationId: string }) {
    return this.reports.list(request.organizationId);
  }

  @GrpcMethod('AnalyticsService', 'GetReportFile')
  getReportFile(request: { organizationId: string; jobId: string }) {
    return this.reports.file(request.organizationId, request.jobId);
  }

  @GrpcMethod('AnalyticsService', 'Ingest')
  ingest() {
    return this.metrics.ingestStats();
  }
}

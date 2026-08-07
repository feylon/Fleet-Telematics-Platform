import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { PlatformEnv, rpcInvalid, rpcNotFound } from '@fleet/common';
import { ENV } from '../common/env.provider';
import { normalizeLocale } from './report-labels';
import { ReportRecord, ReportStore } from './report.store';

export const REPORTS_QUEUE = 'reports';
export const REPORT_TYPES = new Set(['FLEET_SUMMARY', 'DRIVER_SCORES', 'ALERTS', 'VEHICLE_TRACK', 'DAILY_ROLLUP']);

export const toReportJob = (record: ReportRecord) => ({ jobId: record.jobId, status: record.status, fileName: record.fileName, createdAt: record.createdAt, reportType: record.reportType, format: record.format, error: record.error });

@Injectable()
export class ReportsService {
  constructor(@Inject(ENV) private readonly env: PlatformEnv, private readonly store: ReportStore, @InjectQueue(REPORTS_QUEUE) private readonly queue: Queue) {}

  async request(input: { organizationId: string; reportType: string; format: string; from: string; to: string; locale: string; requestedBy: string; vehicleId: string }) {
    if (!input.organizationId) throw rpcInvalid('organizationId is required');
    if (!REPORT_TYPES.has(input.reportType)) throw rpcInvalid('Unknown report type');
    const format = input.format === 'xlsx' ? 'xlsx' : input.format === 'pdf' ? 'pdf' : null;
    if (!format) throw rpcInvalid('format must be pdf or xlsx');
    if (input.reportType === 'VEHICLE_TRACK' && !input.vehicleId) throw rpcInvalid('vehicleId is required for VEHICLE_TRACK');
    const to = input.to ? new Date(input.to) : new Date();
    const from = input.from ? new Date(input.from) : new Date(to.getTime() - 24 * 3600 * 1000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) throw rpcInvalid('Invalid time range');
    const jobId = randomUUID();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const record: ReportRecord = {
      jobId,
      organizationId: input.organizationId,
      reportType: input.reportType,
      format,
      locale: normalizeLocale(input.locale),
      from: from.toISOString(),
      to: to.toISOString(),
      vehicleId: input.vehicleId ?? '',
      requestedBy: input.requestedBy ?? '',
      status: 'queued',
      fileName: `${input.reportType.toLowerCase()}_${stamp}.${format}`,
      createdAt: new Date().toISOString(),
      error: '',
    };
    await this.store.create(record);
    await this.queue.add('generate', { organizationId: record.organizationId, jobId }, { jobId, attempts: 3, backoff: { type: 'exponential', delay: 3000 }, removeOnComplete: 500, removeOnFail: 500 });
    return toReportJob(record);
  }

  async list(organizationId: string) {
    const records = await this.store.list(organizationId);
    return { items: records.map(toReportJob) };
  }

  async file(organizationId: string, jobId: string) {
    const record = await this.store.get(organizationId, jobId);
    if (!record) throw rpcNotFound('Report not found');
    return {
      fileName: record.fileName,
      path: record.status === 'ready' ? this.pathFor(record) : '',
      contentType: record.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ready: record.status === 'ready',
    };
  }

  pathFor(record: ReportRecord): string {
    return join(this.env.reportsDir, record.organizationId, `${record.jobId}.${record.format}`);
  }
}

import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { ReportStore } from './report.store';
import { ReportGenerator } from './report.generator';
import { REPORTS_QUEUE, ReportsService } from './reports.service';
import { buildPdf } from './pdf.builder';
import { buildXlsx } from './xlsx.builder';

@Processor(REPORTS_QUEUE, { concurrency: 2 })
export class ReportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportsProcessor.name);

  constructor(private readonly store: ReportStore, private readonly generator: ReportGenerator, private readonly reports: ReportsService) {
    super();
  }

  async process(job: Job<{ organizationId: string; jobId: string }>): Promise<void> {
    const record = await this.store.get(job.data.organizationId, job.data.jobId);
    if (!record) return;
    await this.store.update(record.organizationId, record.jobId, { status: 'processing' });
    try {
      const table = await this.generator.build(record);
      const buffer = record.format === 'pdf' ? await buildPdf(table, record.locale) : await buildXlsx(table, record.locale);
      const path = this.reports.pathFor(record);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, buffer);
      await this.store.update(record.organizationId, record.jobId, { status: 'ready', error: '' });
      this.logger.log(`report ${record.jobId} ready (${record.reportType} ${record.format}, ${buffer.length} bytes)`);
    } catch (error) {
      await this.store.update(record.organizationId, record.jobId, { status: job.attemptsMade + 1 >= (job.opts.attempts ?? 1) ? 'failed' : 'queued', error: (error as Error).message });
      throw error;
    }
  }
}

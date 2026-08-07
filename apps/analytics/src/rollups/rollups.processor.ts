import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { RollupsService } from './rollups.service';

export const ROLLUPS_QUEUE = 'rollups';

@Processor(ROLLUPS_QUEUE)
export class RollupsProcessor extends WorkerHost {
  private readonly logger = new Logger(RollupsProcessor.name);

  constructor(private readonly rollups: RollupsService) {
    super();
  }

  async process(job: Job<{ organizationId?: string; day?: string }>): Promise<void> {
    if (job.data.organizationId && job.data.day) {
      const count = await this.rollups.computeDay(job.data.organizationId, job.data.day);
      this.logger.log(`rollup job ${job.id}: ${count} vehicles`);
      return;
    }
    await this.rollups.runNightly();
  }
}

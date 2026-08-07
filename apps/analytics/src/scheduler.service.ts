import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ROLLUPS_QUEUE } from './rollups/rollups.processor';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(@InjectQueue(ROLLUPS_QUEUE) private readonly rollups: Queue) {}

  async onModuleInit(): Promise<void> {
    await this.rollups.upsertJobScheduler('nightly-rollup', { pattern: '15 1 * * *', tz: process.env.TZ ?? 'Asia/Tashkent' }, { name: 'nightly', data: {}, opts: { removeOnComplete: 30, removeOnFail: 30 } });
    this.logger.log('nightly rollup scheduled at 01:15');
  }
}

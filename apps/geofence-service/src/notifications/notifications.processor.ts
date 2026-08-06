import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NOTIFICATIONS_QUEUE, NotificationJob } from './notifications.queue';
import { TelegramSender } from './telegram.sender';

@Processor(NOTIFICATIONS_QUEUE, { concurrency: 5, limiter: { max: 20, duration: 1000 } })
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly telegram: TelegramSender) {
    super();
  }

  async process(job: Job<NotificationJob>): Promise<void> {
    await this.telegram.send(job.data);
    this.logger.debug(`notification ${job.id} delivered (${job.data.alertType})`);
  }
}

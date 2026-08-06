import { Inject, Injectable, Logger } from '@nestjs/common';
import { PlatformEnv } from '@fleet/common';
import { ENV } from '../common/env.provider';
import { NotificationJob } from './notifications.queue';

const ICONS: Record<string, string> = { CRITICAL: '🚨', WARNING: '⚠️', INFO: 'ℹ️' };

export const formatTelegramMessage = (job: NotificationJob): string => {
  const icon = ICONS[job.severity] ?? '';
  const map = `https://www.openstreetmap.org/?mlat=${job.latitude}&mlon=${job.longitude}#map=16/${job.latitude}/${job.longitude}`;
  return `${icon} ${job.alertType} (${job.severity})\n${job.details}\n${job.timestamp}\n${map}`;
};

@Injectable()
export class TelegramSender {
  private readonly logger = new Logger(TelegramSender.name);

  constructor(@Inject(ENV) private readonly env: PlatformEnv) {}

  get enabled(): boolean {
    return Boolean(this.env.telegramBotToken && this.env.telegramChatId);
  }

  async send(job: NotificationJob): Promise<void> {
    if (!this.enabled) {
      this.logger.log(`notification (telegram disabled): ${job.alertType} ${job.severity} ${job.details}`);
      return;
    }
    const response = await fetch(`https://api.telegram.org/bot${this.env.telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: this.env.telegramChatId, text: formatTelegramMessage(job), disable_web_page_preview: true }),
    });
    if (!response.ok) throw new Error(`telegram responded ${response.status}`);
  }
}

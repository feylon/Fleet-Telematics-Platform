import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformEnv } from '@fleet/common';
import { Organization } from '@fleet/database';
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

  private readonly chatCache = new Map<string, { chatId: string | null; at: number }>();

  constructor(@Inject(ENV) private readonly env: PlatformEnv, @InjectRepository(Organization) private readonly organizations: Repository<Organization>) {}

  async chatIdFor(organizationId: string): Promise<string | null> {
    const cached = this.chatCache.get(organizationId);
    if (cached && Date.now() - cached.at < 60000) return cached.chatId;
    const organization = await this.organizations.findOne({ where: { id: organizationId } });
    const chatId = organization?.telegramChatId || this.env.telegramChatId || null;
    this.chatCache.set(organizationId, { chatId, at: Date.now() });
    return chatId;
  }

  async send(job: NotificationJob): Promise<void> {
    const chatId = this.env.telegramBotToken ? await this.chatIdFor(job.organizationId) : null;
    if (!chatId) {
      this.logger.log(`notification (telegram not configured for ${job.organizationId}): ${job.alertType} ${job.severity} ${job.details}`);
      return;
    }
    const response = await fetch(`https://api.telegram.org/bot${this.env.telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: formatTelegramMessage(job), disable_web_page_preview: true }),
    });
    if (!response.ok) throw new Error(`telegram responded ${response.status}`);
  }
}

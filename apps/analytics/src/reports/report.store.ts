import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS } from '../common/redis.provider';

export interface ReportRecord {
  jobId: string;
  organizationId: string;
  reportType: string;
  format: 'pdf' | 'xlsx';
  locale: 'uz' | 'ru';
  from: string;
  to: string;
  vehicleId: string;
  requestedBy: string;
  status: 'queued' | 'processing' | 'ready' | 'failed';
  fileName: string;
  createdAt: string;
  error: string;
}

const KEY = (organizationId: string, jobId: string) => `reports:${organizationId}:${jobId}`;
const LIST = (organizationId: string) => `reports:${organizationId}:list`;
const TTL_SECONDS = 30 * 24 * 3600;

@Injectable()
export class ReportStore {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async create(record: ReportRecord): Promise<void> {
    await this.redis.multi().set(KEY(record.organizationId, record.jobId), JSON.stringify(record), 'EX', TTL_SECONDS).lpush(LIST(record.organizationId), record.jobId).ltrim(LIST(record.organizationId), 0, 199).expire(LIST(record.organizationId), TTL_SECONDS).exec();
  }

  async update(organizationId: string, jobId: string, patch: Partial<ReportRecord>): Promise<ReportRecord | null> {
    const current = await this.get(organizationId, jobId);
    if (!current) return null;
    const next = { ...current, ...patch };
    await this.redis.set(KEY(organizationId, jobId), JSON.stringify(next), 'EX', TTL_SECONDS);
    return next;
  }

  async get(organizationId: string, jobId: string): Promise<ReportRecord | null> {
    const raw = await this.redis.get(KEY(organizationId, jobId));
    return raw ? (JSON.parse(raw) as ReportRecord) : null;
  }

  async list(organizationId: string): Promise<ReportRecord[]> {
    const ids = await this.redis.lrange(LIST(organizationId), 0, 199);
    if (ids.length === 0) return [];
    const raws = await this.redis.mget(ids.map((id) => KEY(organizationId, id)));
    return raws.filter((raw): raw is string => Boolean(raw)).map((raw) => JSON.parse(raw) as ReportRecord);
  }
}

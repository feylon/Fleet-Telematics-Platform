import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { AuditLog } from '@fleet/database';

export interface AuditQuery {
  organizationId?: string;
  userId?: string;
  resource?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

const SENSITIVE_KEYS = new Set(['password', 'newPassword', 'currentPassword', 'refreshToken', 'token', 'passwordHash']);

export const redactPayload = (payload: unknown): Record<string, unknown> | null => {
  if (!payload || typeof payload !== 'object') return null;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEYS.has(key) ? '[REDACTED]' : value;
  }
  return result;
};

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>) {}

  async record(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void> {
    await this.logs.insert(entry as QueryDeepPartialEntity<AuditLog>);
  }

  async search(query: AuditQuery) {
    const where: FindOptionsWhere<AuditLog> = {};
    if (query.organizationId) where.organizationId = query.organizationId;
    if (query.userId) where.userId = query.userId;
    if (query.resource) where.resource = query.resource;
    if (query.from && query.to) where.createdAt = Between(new Date(query.from), new Date(query.to));
    else if (query.from) where.createdAt = MoreThanOrEqual(new Date(query.from));
    else if (query.to) where.createdAt = LessThanOrEqual(new Date(query.to));
    const [items, total] = await this.logs.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return { items, meta: { page: query.page, pageSize: query.pageSize, total } };
  }
}

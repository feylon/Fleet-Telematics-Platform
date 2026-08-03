import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hashPassword, loadEnv } from '@fleet/common';
import { Role, User, UserSession } from '@fleet/database';
import { AuthService } from './auth.service';

class MemoryRepo<T extends { id: string }> {
  rows: T[] = [];
  constructor(private readonly idPrefix: string) {}
  create(data: Partial<T>): T {
    return { ...data } as T;
  }
  async save(entity: T): Promise<T> {
    if (!entity.id) entity.id = `${this.idPrefix}-${this.rows.length + 1}`;
    this.rows.push(entity);
    return entity;
  }
  async insert(data: Partial<T>): Promise<void> {
    await this.save(data as T);
  }
  async findOne(options: { where: Partial<T> }): Promise<T | null> {
    const entries = Object.entries(options.where);
    return this.rows.find((row) => entries.every(([key, value]) => (row as never)[key] === value)) ?? null;
  }
  async find(options: { where: Partial<T> }): Promise<T[]> {
    const entries = Object.entries(options.where);
    return this.rows.filter((row) => entries.every(([key, value]) => (row as never)[key] === value));
  }
  async update(id: string, patch: Partial<T>): Promise<void> {
    const row = this.rows.find((r) => r.id === id);
    if (row) Object.assign(row, patch);
  }
}

class MemoryRedis {
  store = new Map<string, string>();
  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
}

const meta = { ip: '127.0.0.1', userAgent: 'jest' };

const build = async () => {
  const users = new MemoryRepo<User>('user');
  const sessions = new MemoryRepo<UserSession>('session');
  const history = new MemoryRepo<{ id: string }>('history');
  const redis = new MemoryRedis();
  const env = loadEnv('test');
  await users.save({
    id: 'user-1',
    login: 'superadmin01',
    passwordHash: await hashPassword('superadmin01'),
    role: Role.SUPERADMIN,
    organizationId: null,
    fullName: 'Super',
    locale: 'uz',
    isActive: true,
  } as User);
  const service = new AuthService(users as never, sessions as never, history as never, new JwtService({}), env, redis as never);
  return { service, users, sessions, history, redis };
};

describe('AuthService', () => {
  it('logs in with valid credentials and records history', async () => {
    const { service, history, sessions } = await build();
    const pair = await service.login('superadmin01', 'superadmin01', 'web', meta);
    expect(pair.accessToken).toBeTruthy();
    expect(pair.refreshToken).toBeTruthy();
    expect(sessions.rows).toHaveLength(1);
    expect((history.rows[0] as never as { success: boolean }).success).toBe(true);
  });

  it('rejects a wrong password and records a failed attempt', async () => {
    const { service, history } = await build();
    await expect(service.login('superadmin01', 'wrong-pass', 'web', meta)).rejects.toThrow(UnauthorizedException);
    expect((history.rows[0] as never as { success: boolean; reason: string }).reason).toBe('bad_password');
  });

  it('rotates the refresh token and revokes the session when an old token is reused', async () => {
    const { service, sessions } = await build();
    const first = await service.login('superadmin01', 'superadmin01', 'web', meta);
    const second = await service.refresh(first.refreshToken, meta);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    await expect(service.refresh(first.refreshToken, meta)).rejects.toThrow(UnauthorizedException);
    expect(sessions.rows[0].revokedAt).toBeInstanceOf(Date);
    await expect(service.refresh(second.refreshToken, meta)).rejects.toThrow(UnauthorizedException);
    expect(await service.isSessionRevoked(sessions.rows[0].id)).toBe(true);
  });

  it('changes password and revokes other sessions', async () => {
    const { service, sessions } = await build();
    const a = await service.login('superadmin01', 'superadmin01', 'web', meta);
    await service.login('superadmin01', 'superadmin01', 'mobile', meta);
    const keep = sessions.rows[0].id;
    await service.changePassword('user-1', 'superadmin01', 'new-password-123', keep);
    expect(sessions.rows[0].revokedAt).toBeFalsy();
    expect(sessions.rows[1].revokedAt).toBeInstanceOf(Date);
    const again = await service.refresh(a.refreshToken, meta);
    expect(again.accessToken).toBeTruthy();
    await expect(service.login('superadmin01', 'superadmin01', 'web', meta)).rejects.toThrow(UnauthorizedException);
    await expect(service.login('superadmin01', 'new-password-123', 'web', meta)).resolves.toBeTruthy();
  });
});

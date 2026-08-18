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
  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
  multi() {
    const ops: Array<() => void> = [];
    const chain = {
      set: (key: string, value: string) => {
        ops.push(() => this.store.set(key, value));
        return chain;
      },
      del: (key: string) => {
        ops.push(() => this.store.delete(key));
        return chain;
      },
      exec: async () => {
        ops.forEach((op) => op());
        return [];
      },
    };
    return chain;
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
  const organizations = new MemoryRepo<{ id: string; isActive: boolean }>('org');
  const service = new AuthService(users as never, sessions as never, history as never, organizations as never, new JwtService({}), env, redis as never);
  return { service, users, sessions, history, redis, organizations };
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

  it('derives the principal from the session row, not from token claims, and drops revoked sessions', async () => {
    const { service, sessions, users } = await build();
    await service.login('superadmin01', 'superadmin01', 'web', meta);
    const sessionId = sessions.rows[0].id;
    const principal = await service.principal(sessionId);
    expect(principal?.role).toBe(Role.SUPERADMIN);
    expect(principal?.sub).toBe('user-1');
    await users.update('user-1', { role: Role.DRIVER } as never);
    await service.revokeAllForUser('user-1');
    expect(await service.principal(sessionId)).toBeNull();
  });

  it('refuses login and principals for a deactivated organization', async () => {
    const { service, users, organizations, sessions } = await build();
    await organizations.save({ id: 'org-a', isActive: true } as never);
    await users.save({ id: 'user-2', login: 'disp', passwordHash: await hashPassword('dispatcher01pass'), role: Role.DISPATCHER, organizationId: 'org-a', fullName: 'D', locale: 'uz', isActive: true } as User);
    await service.login('disp', 'dispatcher01pass', 'web', meta);
    const sessionId = sessions.rows[0].id;
    expect((await service.principal(sessionId))?.organizationId).toBe('org-a');
    await organizations.update('org-a', { isActive: false } as never);
    await service.revokeAllForOrganization('org-a');
    expect(await service.principal(sessionId)).toBeNull();
    await expect(service.login('disp', 'dispatcher01pass', 'web', meta)).rejects.toThrow(UnauthorizedException);
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

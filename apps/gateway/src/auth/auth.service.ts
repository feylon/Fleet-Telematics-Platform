import { Inject, Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { PlatformEnv, hashPassword, verifyPassword, sha256Hex, randomToken } from '@fleet/common';
import { LoginHistory, User, UserSession } from '@fleet/database';
import { ENV } from '../common/env.provider';
import { REDIS } from '../redis/redis.module';
import { AuthUser, RequestMeta } from '../common/auth-user';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

interface RefreshPayload {
  sub: string;
  sid: string;
  jti: string;
}

export const REVOKED_SESSION_PREFIX = 'session:revoked:';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserSession) private readonly sessions: Repository<UserSession>,
    @InjectRepository(LoginHistory) private readonly history: Repository<LoginHistory>,
    private readonly jwt: JwtService,
    @Inject(ENV) private readonly env: PlatformEnv,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async login(login: string, password: string, client: string, meta: RequestMeta): Promise<TokenPair> {
    const user = await this.users.findOne({ where: { login } });
    if (!user || !user.isActive) {
      await this.recordLogin(null, login, meta, false, user ? 'inactive' : 'unknown_user');
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await verifyPassword(user.passwordHash, password);
    if (!valid) {
      await this.recordLogin(user.id, login, meta, false, 'bad_password');
      throw new UnauthorizedException('Invalid credentials');
    }
    const session = await this.sessions.save(
      this.sessions.create({
        userId: user.id,
        refreshTokenHash: 'pending',
        ip: meta.ip,
        userAgent: meta.userAgent,
        client,
        expiresAt: new Date(Date.now() + this.env.jwt.refreshTtlSeconds * 1000),
        lastUsedAt: new Date(),
      }),
    );
    const pair = await this.issueTokens(user, session.id);
    await this.users.update(user.id, { lastLoginAt: new Date() });
    await this.recordLogin(user.id, login, meta, true, null);
    return pair;
  }

  async refresh(refreshToken: string, meta: RequestMeta): Promise<TokenPair> {
    let payload: RefreshPayload;
    try {
      payload = this.jwt.verify<RefreshPayload>(refreshToken, { secret: this.env.jwt.refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const session = await this.sessions.findOne({ where: { id: payload.sid } });
    if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Session is not active');
    }
    if (session.refreshTokenHash !== sha256Hex(payload.jti)) {
      await this.revokeSession(session.id);
      throw new UnauthorizedException('Refresh token reuse detected, session revoked');
    }
    const user = await this.users.findOne({ where: { id: session.userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('User is not active');
    await this.sessions.update(session.id, { lastUsedAt: new Date(), ip: meta.ip ?? session.ip });
    return this.issueTokens(user, session.id);
  }

  async logout(sessionId: string): Promise<void> {
    await this.revokeSession(sessionId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string, keepSessionId: string): Promise<void> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const valid = await verifyPassword(user.passwordHash, currentPassword);
    if (!valid) throw new BadRequestException('Current password is incorrect');
    await this.users.update(user.id, { passwordHash: await hashPassword(newPassword), mustChangePassword: false });
    const others = await this.sessions.find({ where: { userId } });
    for (const session of others) {
      if (session.id !== keepSessionId && !session.revokedAt) await this.revokeSession(session.id);
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.sessions.update(sessionId, { revokedAt: new Date() });
    await this.redis.set(`${REVOKED_SESSION_PREFIX}${sessionId}`, '1', 'EX', this.env.jwt.accessTtlSeconds + 60);
  }

  async isSessionRevoked(sessionId: string): Promise<boolean> {
    const cached = await this.redis.get(`${REVOKED_SESSION_PREFIX}${sessionId}`);
    if (cached) return true;
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session) return true;
    return Boolean(session.revokedAt) || session.expiresAt.getTime() < Date.now();
  }

  async profile(userId: string): Promise<User | null> {
    return this.users.findOne({ where: { id: userId } });
  }

  private async issueTokens(user: User, sessionId: string): Promise<TokenPair> {
    const jti = randomToken(32);
    await this.sessions.update(sessionId, { refreshTokenHash: sha256Hex(jti) });
    const authUser: AuthUser = {
      sub: user.id,
      login: user.login,
      role: user.role,
      organizationId: user.organizationId,
      sessionId,
      fullName: user.fullName,
      locale: user.locale,
    };
    const accessToken = this.jwt.sign(authUser, { secret: this.env.jwt.accessSecret, expiresIn: this.env.jwt.accessTtlSeconds });
    const refreshToken = this.jwt.sign({ sub: user.id, sid: sessionId, jti } satisfies RefreshPayload, {
      secret: this.env.jwt.refreshSecret,
      expiresIn: this.env.jwt.refreshTtlSeconds,
    });
    return { accessToken, refreshToken, expiresIn: this.env.jwt.accessTtlSeconds, tokenType: 'Bearer' };
  }

  private async recordLogin(userId: string | null, login: string, meta: RequestMeta, success: boolean, reason: string | null): Promise<void> {
    await this.history.insert({ userId, login, ip: meta.ip, userAgent: meta.userAgent, success, reason });
  }
}

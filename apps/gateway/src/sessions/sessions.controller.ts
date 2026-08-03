import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginHistory, UserSession } from '@fleet/database';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../common/decorators';
import { AuthUser } from '../common/auth-user';
import { paginationOf } from '../common/tenant';

@ApiTags('Mobile')
@ApiBearerAuth()
@Controller('api/mobile')
export class SessionsController {
  constructor(
    @InjectRepository(UserSession) private readonly sessions: Repository<UserSession>,
    @InjectRepository(LoginHistory) private readonly history: Repository<LoginHistory>,
    private readonly auth: AuthService,
  ) {}

  @Get('sessions')
  @ApiOperation({ summary: 'List active sessions of the current user' })
  async list(@CurrentUser() user: AuthUser) {
    const rows = await this.sessions.find({ where: { userId: user.sub }, order: { createdAt: 'DESC' } });
    return rows
      .filter((row) => !row.revokedAt && row.expiresAt.getTime() > Date.now())
      .map((row) => ({
        id: row.id,
        ip: row.ip,
        userAgent: row.userAgent,
        client: row.client,
        createdAt: row.createdAt,
        lastUsedAt: row.lastUsedAt,
        expiresAt: row.expiresAt,
        current: row.id === user.sessionId,
      }));
  }

  @Delete('sessions/others')
  @HttpCode(204)
  @ApiOperation({ summary: 'Terminate all sessions except the current one' })
  async terminateOthers(@CurrentUser() user: AuthUser): Promise<void> {
    const rows = await this.sessions.find({ where: { userId: user.sub } });
    for (const row of rows) {
      if (row.id !== user.sessionId && !row.revokedAt) await this.auth.revokeSession(row.id);
    }
  }

  @Delete('sessions/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Terminate a specific session of the current user' })
  async terminate(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    const row = await this.sessions.findOne({ where: { id, userId: user.sub } });
    if (row && !row.revokedAt) await this.auth.revokeSession(row.id);
  }

  @Get('login-history')
  @ApiOperation({ summary: 'Login history of the current user' })
  async loginHistory(@CurrentUser() user: AuthUser, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const { page: p, pageSize: size } = paginationOf(page, pageSize);
    const [items, total] = await this.history.findAndCount({
      where: { userId: user.sub },
      order: { createdAt: 'DESC' },
      skip: (p - 1) * size,
      take: size,
    });
    return { items, meta: { page: p, pageSize: size, total } };
  }
}

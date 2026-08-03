import { Controller, Get, Inject, NotFoundException, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import Redis from 'ioredis';
import { AlertMessage } from '@fleet/common';
import { Role } from '@fleet/database';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '../common/auth-user';
import { resolveOrganizationId } from '../common/tenant';
import { REDIS } from '../redis/redis.module';
import { PresenceService } from './presence.service';
import { deriveStatus } from './status';
import { RECENT_ALERTS_PREFIX } from './live.consumer';

@ApiTags('Live')
@ApiBearerAuth()
@Roles(Role.SUPERADMIN, Role.DISPATCHER, Role.FLEET_MANAGER)
@Controller('api/live')
export class LiveController {
  constructor(private readonly presence: PresenceService, @Inject(REDIS) private readonly redis: Redis) {}

  @Get('vehicles')
  @ApiOperation({ summary: 'Last known position and status of every vehicle in the tenant' })
  @ApiQuery({ name: 'organizationId', required: false })
  async vehicles(@CurrentUser() user: AuthUser, @Query('organizationId') organizationId?: string) {
    const orgId = resolveOrganizationId(user, organizationId);
    const now = new Date();
    const pings = await this.presence.listForOrganization(orgId);
    return pings.map((ping) => ({ ...ping, status: deriveStatus(ping, now) }));
  }

  @Get('vehicles/:id')
  @ApiOperation({ summary: 'Last known position of one vehicle' })
  @ApiQuery({ name: 'organizationId', required: false })
  async vehicle(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query('organizationId') organizationId?: string) {
    const orgId = resolveOrganizationId(user, organizationId);
    const ping = await this.presence.get(id);
    if (!ping || ping.organizationId !== orgId) throw new NotFoundException('No telemetry for this vehicle');
    return { ...ping, status: deriveStatus(ping, new Date()) };
  }

  @Get('alerts/recent')
  @ApiOperation({ summary: 'Most recent alerts for the Alert Center (up to 200)' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async recentAlerts(@CurrentUser() user: AuthUser, @Query('organizationId') organizationId?: string, @Query('limit') limit?: string): Promise<AlertMessage[]> {
    const orgId = resolveOrganizationId(user, organizationId);
    const take = Math.min(200, Math.max(1, Number.parseInt(limit ?? '50', 10) || 50));
    const raws = await this.redis.lrange(`${RECENT_ALERTS_PREFIX}${orgId}`, 0, take - 1);
    return raws.map((raw) => JSON.parse(raw) as AlertMessage);
  }
}

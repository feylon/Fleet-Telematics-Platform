import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@fleet/database';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '../common/auth-user';
import { call } from '../grpc/call';
import { FleetClients } from '../fleet/fleet.clients';
import { AnalyticsClient } from './analytics.client';

@ApiTags('Mobile')
@ApiBearerAuth()
@Roles(Role.DRIVER)
@Controller('api/mobile/driver/stats')
export class DriverStatsController {
  constructor(private readonly analytics: AnalyticsClient, private readonly fleet: FleetClients) {}

  @Get()
  @ApiOperation({ summary: 'Personal safety score, working hours and daily history for the current driver' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async stats(@CurrentUser() user: AuthUser, @Query('from') from?: string, @Query('to') to?: string) {
    const driver = await call(this.fleet.drivers.getByUser({ userId: user.sub }));
    const vehicleId = driver.vehicleId as string;
    if (!vehicleId || !user.organizationId) return { driver, score: null, daily: [] };
    const range = { organizationId: user.organizationId, from: from ?? '', to: to ?? new Date().toISOString() };
    const fromDefault = from ?? new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const [scores, daily] = await Promise.all([
      call(this.analytics.service.driverScores({ ...range, from: fromDefault, vehicleId })),
      call(this.analytics.service.dailyRollups({ ...range, from: fromDefault })),
    ]);
    return { driver, score: scores.items[0] ?? null, daily: daily.items.filter((row) => row.vehicleId === vehicleId) };
  }
}

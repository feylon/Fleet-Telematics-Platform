import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream, existsSync } from 'node:fs';
import { Role } from '@fleet/database';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '../common/auth-user';
import { paginationOf, resolveOrganizationId } from '../common/tenant';
import { call } from '../grpc/call';
import { AnalyticsClient } from './analytics.client';
import { ReportRequestDto } from './analytics.dto';

const rangeOf = (user: AuthUser, organizationId?: string, from?: string, to?: string) => ({ organizationId: resolveOrganizationId(user, organizationId), from: from ?? '', to: to ?? '' });

@ApiTags('Analytics')
@ApiBearerAuth()
@Roles(Role.SUPERADMIN, Role.DISPATCHER, Role.FLEET_MANAGER)
@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsClient) {}

  @Get('summary')
  @ApiOperation({ summary: 'Fleet KPIs: mileage, fuel, speeds, moving and idle time, alerts' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  summary(@CurrentUser() user: AuthUser, @Query('organizationId') organizationId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return call(this.analytics.service.summary(rangeOf(user, organizationId, from, to)));
  }

  @Get('vehicles/:vehicleId/series')
  @ApiOperation({ summary: 'Bucketed speed, fuel and engine temperature series for charts' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'bucketSeconds', required: false })
  series(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string, @Query('organizationId') organizationId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('bucketSeconds') bucketSeconds?: string) {
    return call(this.analytics.service.vehicleSeries({ ...rangeOf(user, organizationId, from, to), vehicleId, bucketSeconds: Number(bucketSeconds ?? 60) }));
  }

  @Get('vehicles/:vehicleId/track')
  @ApiOperation({ summary: 'Raw GPS track for route playback' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'limit', required: false })
  track(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string, @Query('organizationId') organizationId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('limit') limit?: string) {
    return call(this.analytics.service.track({ ...rangeOf(user, organizationId, from, to), vehicleId, limit: Number(limit ?? 5000) }));
  }

  @Get('driver-scores')
  @ApiOperation({ summary: 'Eco-driving scores per vehicle and driver' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'vehicleId', required: false })
  driverScores(@CurrentUser() user: AuthUser, @Query('organizationId') organizationId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('vehicleId') vehicleId?: string) {
    return call(this.analytics.service.driverScores({ ...rangeOf(user, organizationId, from, to), vehicleId: vehicleId ?? '' }));
  }

  @Get('daily')
  @ApiOperation({ summary: 'Daily rollups per vehicle' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  daily(@CurrentUser() user: AuthUser, @Query('organizationId') organizationId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return call(this.analytics.service.dailyRollups(rangeOf(user, organizationId, from, to)));
  }

  @Post('daily/recompute')
  @Roles(Role.SUPERADMIN, Role.FLEET_MANAGER)
  @ApiOperation({ summary: 'Recompute daily rollups for a range on demand' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  recompute(@CurrentUser() user: AuthUser, @Query('organizationId') organizationId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return call(this.analytics.service.runRollup(rangeOf(user, organizationId, from, to)));
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Alert history with filters and pagination' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'alertType', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  alerts(
    @CurrentUser() user: AuthUser,
    @Query('organizationId') organizationId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('alertType') alertType?: string,
    @Query('severity') severity?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return call(this.analytics.service.alerts({ ...rangeOf(user, organizationId, from, to), vehicleId: vehicleId ?? '', alertType: alertType ?? '', severity: severity ?? '', pagination: paginationOf(page, pageSize) }));
  }

  @Get('alerts/stats')
  @ApiOperation({ summary: 'Alert counts by type' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  alertStats(@CurrentUser() user: AuthUser, @Query('organizationId') organizationId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return call(this.analytics.service.alertStats(rangeOf(user, organizationId, from, to)));
  }

  @Get('heatmap')
  @ApiOperation({ summary: 'Position density cells for the heatmap layer' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'precision', required: false })
  heatmap(@CurrentUser() user: AuthUser, @Query('organizationId') organizationId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('precision') precision?: string) {
    return call(this.analytics.service.heatmap({ ...rangeOf(user, organizationId, from, to), precision: Number(precision ?? 3) }));
  }

  @Post('reports')
  @ApiOperation({ summary: 'Request a PDF or Excel report; generated asynchronously by BullMQ' })
  @ApiQuery({ name: 'organizationId', required: false })
  requestReport(@CurrentUser() user: AuthUser, @Body() dto: ReportRequestDto, @Query('organizationId') organizationId?: string) {
    return call(this.analytics.service.requestReport({ organizationId: resolveOrganizationId(user, organizationId), reportType: dto.reportType, format: dto.format, from: dto.from ?? '', to: dto.to ?? '', locale: dto.locale ?? user.locale, requestedBy: user.sub, vehicleId: dto.vehicleId ?? '' }));
  }

  @Get('reports')
  @ApiOperation({ summary: 'List generated reports' })
  @ApiQuery({ name: 'organizationId', required: false })
  listReports(@CurrentUser() user: AuthUser, @Query('organizationId') organizationId?: string) {
    return call(this.analytics.service.listReports({ organizationId: resolveOrganizationId(user, organizationId) }));
  }

  @Get('reports/:jobId/download')
  @ApiOperation({ summary: 'Download a ready report file' })
  @ApiQuery({ name: 'organizationId', required: false })
  async download(@CurrentUser() user: AuthUser, @Param('jobId', ParseUUIDPipe) jobId: string, @Res() res: Response, @Query('organizationId') organizationId?: string): Promise<void> {
    const file = await call(this.analytics.service.getReportFile({ organizationId: resolveOrganizationId(user, organizationId), jobId }));
    if (!file.ready || !file.path || !existsSync(file.path)) throw new NotFoundException('Report is not ready');
    res.setHeader('content-type', file.contentType);
    res.setHeader('content-disposition', `attachment; filename="${file.fileName}"`);
    createReadStream(file.path).pipe(res);
  }
}

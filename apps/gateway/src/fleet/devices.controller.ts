import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@fleet/database';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '../common/auth-user';
import { paginationOf, resolveOrganizationId } from '../common/tenant';
import { call } from '../grpc/call';
import { FleetClients } from './fleet.clients';
import { DeviceDto } from './fleet.dto';

@ApiTags('Fleet')
@ApiBearerAuth()
@Roles(Role.SUPERADMIN, Role.FLEET_MANAGER)
@Controller('api/fleet/devices')
export class DevicesController {
  constructor(private readonly fleet: FleetClients) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.FLEET_MANAGER, Role.DISPATCHER)
  @ApiOperation({ summary: 'List GPS trackers' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  list(@CurrentUser() user: AuthUser, @Query('organizationId') organizationId?: string, @Query('search') search?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return call(this.fleet.devices.list({ organizationId: resolveOrganizationId(user, organizationId), search: search ?? '', pagination: paginationOf(page, pageSize) }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Tracker details' })
  @ApiQuery({ name: 'organizationId', required: false })
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query('organizationId') organizationId?: string) {
    return call(this.fleet.devices.get({ id, organizationId: resolveOrganizationId(user, organizationId) }));
  }

  @Post()
  @ApiOperation({ summary: 'Register a tracker; the response contains the device token exactly once' })
  @ApiQuery({ name: 'organizationId', required: false })
  create(@CurrentUser() user: AuthUser, @Body() dto: DeviceDto, @Query('organizationId') organizationId?: string) {
    return call(this.fleet.devices.create({ ...dto, organizationId: resolveOrganizationId(user, organizationId) }));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a tracker or re-bind it to another vehicle' })
  @ApiQuery({ name: 'organizationId', required: false })
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DeviceDto, @Query('organizationId') organizationId?: string) {
    return call(this.fleet.devices.update({ id, input: { ...dto, organizationId: resolveOrganizationId(user, organizationId) } }));
  }

  @Post(':id/rotate-token')
  @ApiOperation({ summary: 'Issue a new device token (old one stops working immediately)' })
  @ApiQuery({ name: 'organizationId', required: false })
  rotate(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query('organizationId') organizationId?: string) {
    return call(this.fleet.devices.rotateToken({ id, organizationId: resolveOrganizationId(user, organizationId) }));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a tracker' })
  @ApiQuery({ name: 'organizationId', required: false })
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query('organizationId') organizationId?: string): Promise<void> {
    await call(this.fleet.devices.delete({ id, organizationId: resolveOrganizationId(user, organizationId) }));
  }
}

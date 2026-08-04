import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@fleet/database';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '../common/auth-user';
import { paginationOf, resolveOrganizationId } from '../common/tenant';
import { call } from '../grpc/call';
import { FleetClients } from './fleet.clients';
import { VehicleDto, VehicleStatusDto } from './fleet.dto';

@ApiTags('Fleet')
@ApiBearerAuth()
@Controller('api/fleet/vehicles')
export class VehiclesController {
  constructor(private readonly fleet: FleetClients) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.DISPATCHER, Role.FLEET_MANAGER)
  @ApiOperation({ summary: 'List vehicles with search, status filter and pagination' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  list(@CurrentUser() user: AuthUser, @Query('organizationId') organizationId?: string, @Query('search') search?: string, @Query('status') status?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return call(this.fleet.vehicles.list({ organizationId: resolveOrganizationId(user, organizationId), search: search ?? '', status: status ?? '', pagination: paginationOf(page, pageSize) }));
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.DISPATCHER, Role.FLEET_MANAGER)
  @ApiOperation({ summary: 'Vehicle details' })
  @ApiQuery({ name: 'organizationId', required: false })
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query('organizationId') organizationId?: string) {
    return call(this.fleet.vehicles.get({ id, organizationId: resolveOrganizationId(user, organizationId) }));
  }

  @Post()
  @Roles(Role.SUPERADMIN, Role.FLEET_MANAGER)
  @ApiOperation({ summary: 'Register a vehicle' })
  @ApiQuery({ name: 'organizationId', required: false })
  create(@CurrentUser() user: AuthUser, @Body() dto: VehicleDto, @Query('organizationId') organizationId?: string) {
    return call(this.fleet.vehicles.create({ ...dto, organizationId: resolveOrganizationId(user, organizationId) }));
  }

  @Put(':id')
  @Roles(Role.SUPERADMIN, Role.FLEET_MANAGER)
  @ApiOperation({ summary: 'Update a vehicle' })
  @ApiQuery({ name: 'organizationId', required: false })
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: VehicleDto, @Query('organizationId') organizationId?: string) {
    return call(this.fleet.vehicles.update({ id, input: { ...dto, organizationId: resolveOrganizationId(user, organizationId) } }));
  }

  @Put(':id/status')
  @Roles(Role.SUPERADMIN, Role.FLEET_MANAGER)
  @ApiOperation({ summary: 'Mark vehicle ACTIVE, MAINTENANCE or OUT_OF_SERVICE' })
  @ApiQuery({ name: 'organizationId', required: false })
  setStatus(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: VehicleStatusDto, @Query('organizationId') organizationId?: string) {
    return call(this.fleet.vehicles.setStatus({ id, organizationId: resolveOrganizationId(user, organizationId), status: dto.status }));
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.SUPERADMIN, Role.FLEET_MANAGER)
  @ApiOperation({ summary: 'Delete a vehicle' })
  @ApiQuery({ name: 'organizationId', required: false })
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query('organizationId') organizationId?: string): Promise<void> {
    await call(this.fleet.vehicles.delete({ id, organizationId: resolveOrganizationId(user, organizationId) }));
  }
}

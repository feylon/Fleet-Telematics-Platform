import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@fleet/database';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '../common/auth-user';
import { paginationOf, resolveOrganizationId } from '../common/tenant';
import { call } from '../grpc/call';
import { FleetClients } from './fleet.clients';
import { FuelNormDto, MaintenanceDto } from './fleet.dto';

@ApiTags('Fleet')
@ApiBearerAuth()
@Controller('api/fleet/maintenance')
export class MaintenanceController {
  constructor(private readonly fleet: FleetClients) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.FLEET_MANAGER, Role.DISPATCHER)
  @ApiOperation({ summary: 'Maintenance history, optionally per vehicle' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  list(@CurrentUser() user: AuthUser, @Query('organizationId') organizationId?: string, @Query('vehicleId') vehicleId?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return call(this.fleet.maintenance.list({ organizationId: resolveOrganizationId(user, organizationId), vehicleId: vehicleId ?? '', pagination: paginationOf(page, pageSize) }));
  }

  @Get('due')
  @Roles(Role.SUPERADMIN, Role.FLEET_MANAGER, Role.DISPATCHER)
  @ApiOperation({ summary: 'Vehicles with inspections or services due soon' })
  @ApiQuery({ name: 'organizationId', required: false })
  due(@CurrentUser() user: AuthUser, @Query('organizationId') organizationId?: string) {
    return call(this.fleet.maintenance.due({ organizationId: resolveOrganizationId(user, organizationId) }));
  }

  @Post()
  @Roles(Role.SUPERADMIN, Role.FLEET_MANAGER)
  @ApiOperation({ summary: 'Record a maintenance event; can schedule downtime and mark the vehicle out of service' })
  @ApiQuery({ name: 'organizationId', required: false })
  create(@CurrentUser() user: AuthUser, @Body() dto: MaintenanceDto, @Query('organizationId') organizationId?: string) {
    return call(this.fleet.maintenance.create({ ...dto, organizationId: resolveOrganizationId(user, organizationId), performedById: user.sub }));
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.SUPERADMIN, Role.FLEET_MANAGER)
  @ApiOperation({ summary: 'Delete a maintenance record' })
  @ApiQuery({ name: 'organizationId', required: false })
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query('organizationId') organizationId?: string): Promise<void> {
    await call(this.fleet.maintenance.delete({ id, organizationId: resolveOrganizationId(user, organizationId) }));
  }

  @Get('fuel-norms/:vehicleId')
  @Roles(Role.SUPERADMIN, Role.FLEET_MANAGER, Role.DISPATCHER)
  @ApiOperation({ summary: 'Fuel consumption standard of a vehicle' })
  @ApiQuery({ name: 'organizationId', required: false })
  fuelNorm(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string, @Query('organizationId') organizationId?: string) {
    return call(this.fleet.maintenance.getFuelNorm({ id: vehicleId, organizationId: resolveOrganizationId(user, organizationId) }));
  }

  @Put('fuel-norms/:vehicleId')
  @Roles(Role.SUPERADMIN, Role.FLEET_MANAGER)
  @ApiOperation({ summary: 'Set fuel consumption standard and fuel-drop alert threshold' })
  @ApiQuery({ name: 'organizationId', required: false })
  setFuelNorm(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string, @Body() dto: FuelNormDto, @Query('organizationId') organizationId?: string) {
    return call(this.fleet.maintenance.upsertFuelNorm({ ...dto, vehicleId, organizationId: resolveOrganizationId(user, organizationId) }));
  }
}

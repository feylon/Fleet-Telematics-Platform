import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@fleet/database';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '../common/auth-user';
import { paginationOf, resolveOrganizationId } from '../common/tenant';
import { call } from '../grpc/call';
import { FleetClients } from './fleet.clients';
import { AssignVehicleDto, DriverDto } from './fleet.dto';

@ApiTags('Fleet')
@ApiBearerAuth()
@Controller('api/fleet/drivers')
export class DriversController {
  constructor(private readonly fleet: FleetClients) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.DISPATCHER, Role.FLEET_MANAGER)
  @ApiOperation({ summary: 'List drivers' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  list(@CurrentUser() user: AuthUser, @Query('organizationId') organizationId?: string, @Query('search') search?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return call(this.fleet.drivers.list({ organizationId: resolveOrganizationId(user, organizationId), search: search ?? '', pagination: paginationOf(page, pageSize) }));
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.DISPATCHER, Role.FLEET_MANAGER)
  @ApiOperation({ summary: 'Driver details' })
  @ApiQuery({ name: 'organizationId', required: false })
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query('organizationId') organizationId?: string) {
    return call(this.fleet.drivers.get({ id, organizationId: resolveOrganizationId(user, organizationId) }));
  }

  @Post()
  @Roles(Role.SUPERADMIN, Role.FLEET_MANAGER)
  @ApiOperation({ summary: 'Create a driver profile' })
  @ApiQuery({ name: 'organizationId', required: false })
  create(@CurrentUser() user: AuthUser, @Body() dto: DriverDto, @Query('organizationId') organizationId?: string) {
    return call(this.fleet.drivers.create({ ...dto, organizationId: resolveOrganizationId(user, organizationId) }));
  }

  @Put(':id')
  @Roles(Role.SUPERADMIN, Role.FLEET_MANAGER)
  @ApiOperation({ summary: 'Update a driver profile (drivers cannot edit their own profile)' })
  @ApiQuery({ name: 'organizationId', required: false })
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DriverDto, @Query('organizationId') organizationId?: string) {
    return call(this.fleet.drivers.update({ id, input: { ...dto, organizationId: resolveOrganizationId(user, organizationId) } }));
  }

  @Put(':id/vehicle')
  @Roles(Role.SUPERADMIN, Role.FLEET_MANAGER, Role.DISPATCHER)
  @ApiOperation({ summary: 'Assign or unassign a vehicle' })
  @ApiQuery({ name: 'organizationId', required: false })
  assign(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignVehicleDto, @Query('organizationId') organizationId?: string) {
    return call(this.fleet.drivers.assignVehicle({ id, organizationId: resolveOrganizationId(user, organizationId), vehicleId: dto.vehicleId ?? '' }));
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.SUPERADMIN, Role.FLEET_MANAGER)
  @ApiOperation({ summary: 'Delete a driver profile' })
  @ApiQuery({ name: 'organizationId', required: false })
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query('organizationId') organizationId?: string): Promise<void> {
    await call(this.fleet.drivers.delete({ id, organizationId: resolveOrganizationId(user, organizationId) }));
  }
}

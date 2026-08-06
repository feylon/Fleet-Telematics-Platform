import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@fleet/database';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '../common/auth-user';
import { paginationOf, resolveOrganizationId } from '../common/tenant';
import { call } from '../grpc/call';
import { DispatchClients } from './dispatch.clients';
import { AssignOrderDto, OrderDto, OrderStatusDto, SetRouteDto } from './dispatch.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('api/orders')
export class OrdersController {
  constructor(private readonly dispatch: DispatchClients) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.DISPATCHER, Role.FLEET_MANAGER)
  @ApiOperation({ summary: 'List delivery orders with filters' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'driverId', required: false })
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  list(
    @CurrentUser() user: AuthUser,
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('driverId') driverId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return call(this.dispatch.orders.list({ organizationId: resolveOrganizationId(user, organizationId), status: status ?? '', search: search ?? '', driverId: driverId ?? '', vehicleId: vehicleId ?? '', pagination: paginationOf(page, pageSize) }));
  }

  @Get('nearby')
  @Roles(Role.SUPERADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Available vehicles near a point, nearest first' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'latitude', required: true })
  @ApiQuery({ name: 'longitude', required: true })
  @ApiQuery({ name: 'radiusKm', required: false })
  @ApiQuery({ name: 'limit', required: false })
  nearby(@CurrentUser() user: AuthUser, @Query('latitude') latitude: string, @Query('longitude') longitude: string, @Query('organizationId') organizationId?: string, @Query('radiusKm') radiusKm?: string, @Query('limit') limit?: string) {
    return call(this.dispatch.orders.nearby({ organizationId: resolveOrganizationId(user, organizationId), latitude: Number(latitude), longitude: Number(longitude), radiusKm: Number(radiusKm ?? 25), limit: Number(limit ?? 10) }));
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.DISPATCHER, Role.FLEET_MANAGER)
  @ApiOperation({ summary: 'Order details with route and checkpoints' })
  @ApiQuery({ name: 'organizationId', required: false })
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query('organizationId') organizationId?: string) {
    return call(this.dispatch.orders.get({ id, organizationId: resolveOrganizationId(user, organizationId) }));
  }

  @Post()
  @Roles(Role.SUPERADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Create a delivery order' })
  @ApiQuery({ name: 'organizationId', required: false })
  create(@CurrentUser() user: AuthUser, @Body() dto: OrderDto, @Query('organizationId') organizationId?: string) {
    return call(this.dispatch.orders.create({ ...dto, organizationId: resolveOrganizationId(user, organizationId), createdById: user.sub }));
  }

  @Put(':id')
  @Roles(Role.SUPERADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Update an open order' })
  @ApiQuery({ name: 'organizationId', required: false })
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: OrderDto, @Query('organizationId') organizationId?: string) {
    return call(this.dispatch.orders.update({ id, input: { ...dto, organizationId: resolveOrganizationId(user, organizationId) } }));
  }

  @Put(':id/assign')
  @Roles(Role.SUPERADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Assign a vehicle (and driver) to the order' })
  @ApiQuery({ name: 'organizationId', required: false })
  assign(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignOrderDto, @Query('organizationId') organizationId?: string) {
    return call(this.dispatch.orders.assign({ id, organizationId: resolveOrganizationId(user, organizationId), vehicleId: dto.vehicleId, driverId: dto.driverId ?? '' }));
  }

  @Put(':id/status')
  @Roles(Role.SUPERADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Move the order through its status machine' })
  @ApiQuery({ name: 'organizationId', required: false })
  transition(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: OrderStatusDto, @Query('organizationId') organizationId?: string) {
    return call(this.dispatch.orders.transition({ id, organizationId: resolveOrganizationId(user, organizationId), status: dto.status, actorDriverId: '' }));
  }

  @Put(':id/route')
  @Roles(Role.SUPERADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Set the planned route polyline, deviation threshold and checkpoints' })
  @ApiQuery({ name: 'organizationId', required: false })
  setRoute(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SetRouteDto, @Query('organizationId') organizationId?: string) {
    return call(this.dispatch.routes.setRoute({ orderId: id, organizationId: resolveOrganizationId(user, organizationId), polyline: dto.polyline, deviationThresholdKm: dto.deviationThresholdKm ?? 0, checkpoints: dto.checkpoints ?? [] }));
  }

  @Put(':id/checkpoints/:checkpointId/reach')
  @Roles(Role.SUPERADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Mark a checkpoint as reached' })
  @ApiQuery({ name: 'organizationId', required: false })
  reach(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Param('checkpointId', ParseUUIDPipe) checkpointId: string, @Query('organizationId') organizationId?: string) {
    return call(this.dispatch.routes.reachCheckpoint({ orderId: id, organizationId: resolveOrganizationId(user, organizationId), checkpointId, actorDriverId: '' }));
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.SUPERADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Delete an order that is not in progress' })
  @ApiQuery({ name: 'organizationId', required: false })
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query('organizationId') organizationId?: string): Promise<void> {
    await call(this.dispatch.orders.delete({ id, organizationId: resolveOrganizationId(user, organizationId) }));
  }
}

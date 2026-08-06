import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@fleet/database';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '../common/auth-user';
import { call } from '../grpc/call';
import { FleetClients } from '../fleet/fleet.clients';
import { DispatchClients } from './dispatch.clients';
import { OrderStatusDto } from './dispatch.dto';

@ApiTags('Mobile')
@ApiBearerAuth()
@Roles(Role.DRIVER)
@Controller('api/mobile/driver/orders')
export class DriverOrdersController {
  constructor(private readonly dispatch: DispatchClients, private readonly fleet: FleetClients) {}

  private async driverOf(user: AuthUser): Promise<{ id: string; organizationId: string }> {
    const driver = await call(this.fleet.drivers.getByUser({ userId: user.sub }));
    if (!user.organizationId) throw new ForbiddenException('Driver has no organization');
    return { id: driver.id as string, organizationId: user.organizationId };
  }

  @Get()
  @ApiOperation({ summary: 'Orders assigned to the current driver (read-only list with checkpoints)' })
  async list(@CurrentUser() user: AuthUser) {
    const driver = await this.driverOf(user);
    return call(this.dispatch.orders.driverOrders({ organizationId: driver.organizationId, driverId: driver.id }));
  }

  @Get('today')
  @ApiOperation({ summary: 'Today\'s destination checklist for the current driver' })
  async today(@CurrentUser() user: AuthUser) {
    const driver = await this.driverOf(user);
    const response = await call(this.dispatch.orders.driverOrders({ organizationId: driver.organizationId, driverId: driver.id }));
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const items = (response.items ?? []).filter((order) => {
      const status = order.status as string;
      const planned = order.plannedStartAt ? new Date(order.plannedStartAt as string) : null;
      return status === 'ASSIGNED' || status === 'IN_PROGRESS' || (status === 'COMPLETED' && new Date(order.completedAt as string) >= startOfDay) || (planned !== null && planned >= startOfDay);
    });
    return { items };
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Driver starts or completes an assigned order' })
  async transition(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: OrderStatusDto) {
    const driver = await this.driverOf(user);
    return call(this.dispatch.orders.transition({ id, organizationId: driver.organizationId, status: dto.status, actorDriverId: driver.id }));
  }

  @Put(':id/checkpoints/:checkpointId/reach')
  @ApiOperation({ summary: 'Driver marks a checkpoint as reached' })
  async reach(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Param('checkpointId', ParseUUIDPipe) checkpointId: string) {
    const driver = await this.driverOf(user);
    return call(this.dispatch.routes.reachCheckpoint({ orderId: id, organizationId: driver.organizationId, checkpointId, actorDriverId: driver.id }));
  }
}

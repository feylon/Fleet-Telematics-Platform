import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@fleet/database';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '../common/auth-user';
import { call } from '../grpc/call';
import { PresenceService } from '../telemetry/presence.service';
import { deriveStatus } from '../telemetry/status';
import { FleetClients } from './fleet.clients';

@ApiTags('Mobile')
@ApiBearerAuth()
@Roles(Role.DRIVER)
@Controller('api/mobile/driver')
export class DriverMobileController {
  constructor(private readonly fleet: FleetClients, private readonly presence: PresenceService) {}

  @Get('me')
  @ApiOperation({ summary: 'Driver profile with the assigned vehicle and its live status (read-only)' })
  async me(@CurrentUser() user: AuthUser) {
    const driver = await call(this.fleet.drivers.getByUser({ userId: user.sub }));
    const vehicleId = driver.vehicleId as string;
    let vehicle: Record<string, unknown> | null = null;
    let live: Record<string, unknown> | null = null;
    if (vehicleId) {
      vehicle = await call(this.fleet.vehicles.get({ id: vehicleId, organizationId: driver.organizationId as string }));
      const ping = await this.presence.get(vehicleId);
      live = ping ? { ...ping, status: deriveStatus(ping, new Date()) } : { status: 'OFFLINE' };
    }
    return { driver, vehicle, live };
  }
}

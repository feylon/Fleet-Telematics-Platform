import { Module } from '@nestjs/common';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { FleetClients } from './fleet.clients';
import { VehiclesController } from './vehicles.controller';
import { DevicesController } from './devices.controller';
import { DriversController } from './drivers.controller';
import { MaintenanceController } from './maintenance.controller';
import { DriverMobileController } from './driver-mobile.controller';

@Module({
  imports: [TelemetryModule],
  controllers: [VehiclesController, DevicesController, DriversController, MaintenanceController, DriverMobileController],
  providers: [FleetClients],
  exports: [FleetClients],
})
export class FleetModule {}

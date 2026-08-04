import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { loadEnv } from '@fleet/common';
import { buildDataSourceOptions, Device, Driver, FuelNorm, MaintenanceLog, User, Vehicle } from '@fleet/database';
import { EventsModule } from './events/events.module';
import { VehiclesController } from './vehicles/vehicles.controller';
import { VehiclesService } from './vehicles/vehicles.service';
import { DevicesController } from './devices/devices.controller';
import { DevicesService } from './devices/devices.service';
import { DriversController } from './drivers/drivers.controller';
import { DriversService } from './drivers/drivers.service';
import { MaintenanceController } from './maintenance/maintenance.controller';
import { MaintenanceService } from './maintenance/maintenance.service';
import { HealthController } from './health.controller';

const env = loadEnv('fleet-core');

@Module({
  imports: [TypeOrmModule.forRoot(buildDataSourceOptions(env)), TypeOrmModule.forFeature([Vehicle, Device, Driver, User, MaintenanceLog, FuelNorm]), EventsModule],
  controllers: [VehiclesController, DevicesController, DriversController, MaintenanceController, HealthController],
  providers: [VehiclesService, DevicesService, DriversService, MaintenanceService],
})
export class AppModule {}

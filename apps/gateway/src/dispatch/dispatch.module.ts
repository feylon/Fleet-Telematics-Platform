import { Module } from '@nestjs/common';
import { FleetModule } from '../fleet/fleet.module';
import { DispatchClients } from './dispatch.clients';
import { OrdersController } from './orders.controller';
import { DriverOrdersController } from './driver-orders.controller';

@Module({
  imports: [FleetModule],
  controllers: [OrdersController, DriverOrdersController],
  providers: [DispatchClients],
  exports: [DispatchClients],
})
export class DispatchModule {}

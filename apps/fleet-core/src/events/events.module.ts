import { Global, Module } from '@nestjs/common';
import { envProvider, ENV } from '../common/env.provider';
import { FleetEventsProducer } from './fleet-events.producer';

@Global()
@Module({
  providers: [envProvider, FleetEventsProducer],
  exports: [FleetEventsProducer, ENV],
})
export class EventsModule {}

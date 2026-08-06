import { Module } from '@nestjs/common';
import { GeofencesController } from './geofences.controller';

@Module({ controllers: [GeofencesController] })
export class GeofencesModule {}

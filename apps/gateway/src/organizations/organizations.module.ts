import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver, Organization, User, Vehicle } from '@fleet/database';
import { OrganizationsController } from './organizations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, User, Vehicle, Driver])],
  controllers: [OrganizationsController],
})
export class OrganizationsModule {}

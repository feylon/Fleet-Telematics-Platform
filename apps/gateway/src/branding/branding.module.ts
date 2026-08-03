import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformSetting } from '@fleet/database';
import { BrandingService } from './branding.service';
import { AdminBrandingController, PublicBrandingController } from './branding.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformSetting])],
  controllers: [PublicBrandingController, AdminBrandingController],
  providers: [BrandingService],
  exports: [BrandingService],
})
export class BrandingModule {}

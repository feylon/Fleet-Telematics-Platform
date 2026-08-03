import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@fleet/database';
import { Public, Roles } from '../common/decorators';
import { BrandingService } from './branding.service';
import { UpdateBrandingDto } from './branding.dto';

@ApiTags('Public')
@Controller('api/public/branding')
export class PublicBrandingController {
  constructor(private readonly branding: BrandingService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Platform name, description, logo and colors rendered across the UI' })
  get() {
    return this.branding.get();
  }
}

@ApiTags('Superadmin')
@ApiBearerAuth()
@Roles(Role.SUPERADMIN)
@Controller('api/admin/branding')
export class AdminBrandingController {
  constructor(private readonly branding: BrandingService) {}

  @Put()
  @ApiOperation({ summary: 'Update global branding' })
  update(@Body() dto: UpdateBrandingDto) {
    return this.branding.update(dto);
  }
}

import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@fleet/database';
import { Roles } from '../common/decorators';
import { ObservabilityService } from './observability.service';

@ApiTags('Superadmin')
@ApiBearerAuth()
@Roles(Role.SUPERADMIN)
@Controller('api/admin/system')
export class ObservabilityController {
  constructor(private readonly observability: ObservabilityService) {}

  @Get('health')
  @ApiOperation({ summary: 'Read-only system health: Kafka lag, ClickHouse ingestion, Redis, PostgreSQL, WebSocket clients' })
  snapshot() {
    return this.observability.snapshot();
  }
}

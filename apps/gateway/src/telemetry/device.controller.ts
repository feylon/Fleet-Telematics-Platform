import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public, SkipAudit } from '../common/decorators';
import { IngestService } from './ingest.service';
import { TelemetryBatchDto, TelemetryPingDto } from './telemetry.dto';

@ApiTags('Device')
@ApiHeader({ name: 'x-device-imei', required: true, description: 'Tracker IMEI' })
@ApiHeader({ name: 'x-device-token', required: true, description: 'Per-device secret token issued when the device was registered' })
@Public()
@SkipAudit()
@Controller('api/device/telemetry')
export class DeviceController {
  constructor(private readonly ingest: IngestService) {}

  @Post()
  @HttpCode(202)
  @Throttle({ default: { limit: 600, ttl: 60000 } })
  @ApiOperation({ summary: 'Ingest a single GPS/telemetry ping' })
  single(@Headers('x-device-imei') imei: string | undefined, @Headers('x-device-token') token: string | undefined, @Body() dto: TelemetryPingDto) {
    return this.ingest.ingest(imei, token, [dto]);
  }

  @Post('batch')
  @HttpCode(202)
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Ingest a buffered batch of pings (up to 500)' })
  batch(@Headers('x-device-imei') imei: string | undefined, @Headers('x-device-token') token: string | undefined, @Body() dto: TelemetryBatchDto) {
    return this.ingest.ingest(imei, token, dto.pings);
  }
}

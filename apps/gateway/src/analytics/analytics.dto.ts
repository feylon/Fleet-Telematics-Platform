import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class ReportRequestDto {
  @ApiProperty({ enum: ['FLEET_SUMMARY', 'DRIVER_SCORES', 'ALERTS', 'VEHICLE_TRACK', 'DAILY_ROLLUP'] })
  @IsIn(['FLEET_SUMMARY', 'DRIVER_SCORES', 'ALERTS', 'VEHICLE_TRACK', 'DAILY_ROLLUP'])
  reportType: string;

  @ApiProperty({ enum: ['pdf', 'xlsx'] })
  @IsIn(['pdf', 'xlsx'])
  format: 'pdf' | 'xlsx';

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ enum: ['uz', 'ru'] })
  @IsOptional()
  @IsIn(['uz', 'ru'])
  locale?: 'uz' | 'ru';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}

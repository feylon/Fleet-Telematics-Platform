import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsISO8601, IsNumber, IsOptional, Max, Min, ValidateNested } from 'class-validator';

export class TelemetryPingDto {
  @ApiPropertyOptional({ description: 'Device time in ISO 8601, defaults to server time' })
  @IsOptional()
  @IsISO8601()
  timestamp?: string;

  @ApiProperty({ example: 41.3111 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 69.2797 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ example: 54.5, description: 'km/h' })
  @IsNumber()
  @Min(0)
  @Max(400)
  speed: number;

  @ApiPropertyOptional({ example: 455 })
  @IsOptional()
  @IsNumber()
  altitude?: number;

  @ApiPropertyOptional({ example: 180 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;

  @ApiPropertyOptional({ example: 63.2, description: 'percent' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  fuelLevel?: number;

  @ApiPropertyOptional({ example: 88 })
  @IsOptional()
  @IsNumber()
  engineTemp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ignitionOn?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isMoving?: boolean;

  @ApiPropertyOptional({ description: 'Panic button pressed' })
  @IsOptional()
  @IsBoolean()
  sos?: boolean;
}

export class TelemetryBatchDto {
  @ApiProperty({ type: [TelemetryPingDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => TelemetryPingDto)
  pings: TelemetryPingDto[];
}

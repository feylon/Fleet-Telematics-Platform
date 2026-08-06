import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsISO8601, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { OrderPriority, OrderStatus } from '@fleet/database';

export class OrderDto {
  @ApiProperty({ example: 'Artel Electronics' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  customerName: string;

  @ApiPropertyOptional({ example: 'Maishiy texnika, 12 palet' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cargoDescription?: string;

  @ApiPropertyOptional({ example: 4200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cargoWeightKg?: number;

  @ApiPropertyOptional({ enum: OrderPriority })
  @IsOptional()
  @IsEnum(OrderPriority)
  priority?: OrderPriority;

  @ApiProperty({ example: 'Toshkent, Sergeli omborxonasi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  originAddress: string;

  @ApiProperty({ example: 41.2228 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  originLatitude: number;

  @ApiProperty({ example: 69.2221 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  originLongitude: number;

  @ApiProperty({ example: 'Samarqand, Registon' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  destinationAddress: string;

  @ApiProperty({ example: 39.6547 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  destinationLatitude: number;

  @ApiProperty({ example: 66.9758 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  destinationLongitude: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  plannedStartAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  plannedEndAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Custom order number, generated when empty' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  orderNumber?: string;
}

export class AssignOrderDto {
  @ApiProperty()
  @IsUUID()
  vehicleId: string;

  @ApiPropertyOptional({ description: 'Defaults to the driver assigned to the vehicle' })
  @IsOptional()
  @IsUUID()
  driverId?: string;
}

export class OrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

export class RoutePointDto {
  @ApiProperty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

export class CheckpointDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  sequence: number;

  @ApiProperty({ example: 'Jizzax posti' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty()
  @IsNumber()
  latitude: number;

  @ApiProperty()
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ example: 300 })
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(5000)
  radiusM?: number;
}

export class SetRouteDto {
  @ApiProperty({ type: [RoutePointDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => RoutePointDto)
  polyline: RoutePointDto[];

  @ApiPropertyOptional({ example: 0.5 })
  @IsOptional()
  @IsNumber()
  @Min(0.05)
  @Max(20)
  deviationThresholdKm?: number;

  @ApiPropertyOptional({ type: [CheckpointDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckpointDto)
  checkpoints?: CheckpointDto[];
}

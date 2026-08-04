import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsISO8601, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { FuelType, MaintenanceType, VehicleStatus } from '@fleet/database';

export class VehicleDto {
  @ApiProperty({ example: '01A123BC' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  plateNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  vin?: string;

  @ApiProperty({ example: 'Isuzu' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  brand: string;

  @ApiProperty({ example: 'NQR 71' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  model: string;

  @ApiPropertyOptional({ example: 2021 })
  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ enum: FuelType })
  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fuelTankCapacity?: number;

  @ApiPropertyOptional({ example: 125000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  odometerKm?: number;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(250)
  maxSpeedKmh?: number;

  @ApiPropertyOptional({ enum: VehicleStatus })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsInt()
  @Min(100)
  maintenanceIntervalKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  nextInspectionAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  nextInspectionOdometerKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  color?: string;

  @ApiPropertyOptional({ enum: ['truck', 'van', 'car', 'bus', 'tractor'] })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  iconType?: string;
}

export class VehicleStatusDto {
  @ApiProperty({ enum: VehicleStatus })
  @IsEnum(VehicleStatus)
  status: VehicleStatus;
}

export class DeviceDto {
  @ApiProperty({ example: '860000000000001' })
  @IsString()
  @Matches(/^\d{8,20}$/)
  imei: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({ example: 'Teltonika FMB920' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  simNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class DriverDto {
  @ApiPropertyOptional({ description: 'Linked login user with DRIVER role' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  licenseNumber?: string;

  @ApiPropertyOptional({ type: [String], example: ['B', 'C'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  licenseCategories?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  licenseExpiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  birthDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  shiftStart?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  shiftEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  hiredAt?: string;
}

export class AssignVehicleDto {
  @ApiPropertyOptional({ description: 'Empty to unassign' })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}

export class MaintenanceDto {
  @ApiProperty()
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ enum: MaintenanceType })
  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @ApiPropertyOptional({ example: '1250000.00' })
  @IsOptional()
  @Matches(/^\d{1,12}(\.\d{1,2})?$/)
  costAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  odometerKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  performedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  nextDueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  nextDueOdometerKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  downtimeFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  downtimeTo?: string;

  @ApiPropertyOptional({ description: 'Mark the vehicle as under maintenance' })
  @IsOptional()
  @IsBoolean()
  markOutOfService?: boolean;
}

export class FuelNormDto {
  @ApiProperty({ example: 24.5 })
  @IsNumber()
  @Min(0.1)
  litersPer100km: number;

  @ApiPropertyOptional({ example: 1.1 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  winterCoefficient?: number;

  @ApiPropertyOptional({ example: 1.15 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  cityCoefficient?: number;

  @ApiPropertyOptional({ example: 0.2, description: 'Fraction of tank lost while stopped that triggers FUEL_DROP' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1)
  fuelDropAlertFraction?: number;
}

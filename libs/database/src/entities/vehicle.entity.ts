import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { FuelType, VehicleStatus } from '../enums';

@Entity({ name: 'vehicles' })
@Index(['organizationId', 'plateNumber'], { unique: true })
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 20 })
  plateNumber: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  vin: string | null;

  @Column({ type: 'varchar', length: 80 })
  brand: string;

  @Column({ type: 'varchar', length: 80 })
  model: string;

  @Column({ type: 'smallint', nullable: true })
  year: number | null;

  @Column({ type: 'enum', enum: FuelType, enumName: 'fuel_type_enum', default: FuelType.DIESEL })
  fuelType: FuelType;

  @Column({ type: 'real', nullable: true })
  fuelTankCapacity: number | null;

  @Column({ type: 'real', default: 0 })
  odometerKm: number;

  @Column({ type: 'smallint', default: 90 })
  maxSpeedKmh: number;

  @Column({ type: 'enum', enum: VehicleStatus, enumName: 'vehicle_status_enum', default: VehicleStatus.ACTIVE })
  status: VehicleStatus;

  @Column({ type: 'integer', default: 10000 })
  maintenanceIntervalKm: number;

  @Column({ type: 'timestamptz', nullable: true })
  nextInspectionAt: Date | null;

  @Column({ type: 'real', nullable: true })
  nextInspectionOdometerKm: number | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  color: string | null;

  @Column({ type: 'varchar', length: 40, default: 'truck' })
  iconType: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

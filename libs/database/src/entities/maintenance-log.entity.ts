import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { MaintenanceType } from '../enums';

@Entity({ name: 'maintenance_logs' })
export class MaintenanceLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  organizationId: string;

  @Index()
  @Column({ type: 'uuid' })
  vehicleId: string;

  @Column({ type: 'enum', enum: MaintenanceType, enumName: 'maintenance_type_enum' })
  type: MaintenanceType;

  @Column({ type: 'varchar', length: 1000 })
  description: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  costAmount: string;

  @Column({ type: 'real', nullable: true })
  odometerKm: number | null;

  @Column({ type: 'timestamptz' })
  performedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  nextDueAt: Date | null;

  @Column({ type: 'real', nullable: true })
  nextDueOdometerKm: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  downtimeFrom: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  downtimeTo: Date | null;

  @Column({ type: 'uuid', nullable: true })
  performedById: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

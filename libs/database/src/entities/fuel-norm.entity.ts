import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'fuel_norms' })
export class FuelNorm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid', unique: true })
  vehicleId: string;

  @Column({ type: 'real' })
  litersPer100Km: number;

  @Column({ type: 'real', default: 1.1 })
  winterCoefficient: number;

  @Column({ type: 'real', default: 1.15 })
  cityCoefficient: number;

  @Column({ type: 'real', default: 0.2 })
  fuelDropAlertFraction: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

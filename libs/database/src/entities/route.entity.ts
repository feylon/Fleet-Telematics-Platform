import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'routes' })
export class Route {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid', unique: true })
  orderId: string;

  @Column({ type: 'jsonb' })
  polyline: [number, number][];

  @Column({ type: 'real', default: 0 })
  distanceKm: number;

  @Column({ type: 'real', default: 0.5 })
  deviationThresholdKm: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

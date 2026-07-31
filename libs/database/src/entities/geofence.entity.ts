import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

@Entity({ name: 'geofences' })
export class Geofence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'jsonb' })
  polygon: GeoJsonPolygon;

  @Column({ type: 'smallint', nullable: true })
  speedLimitKmh: number | null;

  @Column({ type: 'time', nullable: true })
  allowedFrom: string | null;

  @Column({ type: 'time', nullable: true })
  allowedTo: string | null;

  @Column({ type: 'boolean', default: true })
  alertOnEnter: boolean;

  @Column({ type: 'boolean', default: true })
  alertOnExit: boolean;

  @Column({ type: 'varchar', length: 20, default: '#2563eb' })
  color: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'route_checkpoints' })
export class RouteCheckpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  routeId: string;

  @Column({ type: 'smallint' })
  sequence: number;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  @Column({ type: 'integer', default: 200 })
  radiusM: number;

  @Column({ type: 'timestamptz', nullable: true })
  reachedAt: Date | null;
}

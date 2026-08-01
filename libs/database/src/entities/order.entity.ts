import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { OrderPriority, OrderStatus } from '../enums';

@Entity({ name: 'orders' })
@Index(['organizationId', 'orderNumber'], { unique: true })
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 40 })
  orderNumber: string;

  @Column({ type: 'varchar', length: 200 })
  customerName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cargoDescription: string | null;

  @Column({ type: 'real', nullable: true })
  cargoWeightKg: number | null;

  @Column({ type: 'enum', enum: OrderStatus, enumName: 'order_status_enum', default: OrderStatus.CREATED })
  status: OrderStatus;

  @Column({ type: 'enum', enum: OrderPriority, enumName: 'order_priority_enum', default: OrderPriority.NORMAL })
  priority: OrderPriority;

  @Column({ type: 'varchar', length: 300 })
  originAddress: string;

  @Column({ type: 'double precision' })
  originLatitude: number;

  @Column({ type: 'double precision' })
  originLongitude: number;

  @Column({ type: 'varchar', length: 300 })
  destinationAddress: string;

  @Column({ type: 'double precision' })
  destinationLatitude: number;

  @Column({ type: 'double precision' })
  destinationLongitude: number;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  vehicleId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  driverId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  plannedStartAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  plannedEndAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  notes: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

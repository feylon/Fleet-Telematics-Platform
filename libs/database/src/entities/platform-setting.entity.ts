import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'platform_settings' })
export class PlatformSetting {
  @PrimaryColumn({ type: 'smallint', default: 1 })
  id: number;

  @Column({ type: 'varchar', length: 120 })
  platformName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  logoDataUrl: string | null;

  @Column({ type: 'varchar', length: 20, default: '#0ea5e9' })
  primaryColor: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  supportEmail: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

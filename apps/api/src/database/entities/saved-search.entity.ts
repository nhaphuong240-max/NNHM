import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'saved_searches' })
export class SavedSearchEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Index(['tenantId', 'visitorId'])
  @Column({ name: 'visitor_id', type: 'varchar', length: 64 })
  visitorId!: string;

  @Column({ type: 'varchar', length: 16, default: 'buy' })
  intent!: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  q!: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  filters!: Record<string, unknown>;

  @Column({ name: 'alert_frequency', type: 'varchar', length: 16, default: 'none' })
  alertFrequency!: 'none' | 'daily' | 'instant';

  @Column({ name: 'marketing_consent', type: 'boolean', default: false })
  marketingConsent!: boolean;

  @Column({ name: 'user_id', type: 'varchar', length: 32, nullable: true })
  userId!: string | null;

  @Column({ name: 'alert_opt_out', type: 'boolean', default: false })
  alertOptOut!: boolean;

  @Column({ name: 'last_alert_at', type: 'timestamptz', nullable: true })
  lastAlertAt!: Date | null;

  @Column({ name: 'alerts_sent_today', type: 'int', default: 0 })
  alertsSentToday!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

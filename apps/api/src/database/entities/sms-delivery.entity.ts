import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SmsDeliveryStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED';
export type SmsSourceType = 'MANUAL' | 'PAYMENT_OTP' | 'PAYMENT_SUCCESS' | 'ESIGN_OTP';

@Entity({ name: 'sms_deliveries' })
@Index(['tenantId', 'sourceType', 'sourceId'], { unique: true, where: '"source_id" IS NOT NULL' })
export class SmsDeliveryEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'template_id', type: 'varchar', length: 64 })
  templateId!: string;

  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({ type: 'varchar', length: 16, default: 'QUEUED' })
  status!: SmsDeliveryStatus;

  @Column({ type: 'jsonb', default: {} })
  params!: Record<string, unknown>;

  @Column({ name: 'provider_ref', type: 'varchar', length: 64, nullable: true })
  providerRef!: string | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ name: 'source_type', type: 'varchar', length: 32, nullable: true })
  sourceType!: SmsSourceType | null;

  @Column({ name: 'source_id', type: 'varchar', length: 64, nullable: true })
  sourceId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

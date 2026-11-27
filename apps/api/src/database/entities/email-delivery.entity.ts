import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type EmailDeliveryStatus = 'QUEUED' | 'SENT' | 'FAILED';
export type EmailSourceType = 'ESIGN_LINK' | 'ESIGN_OTP';

@Entity({ name: 'email_deliveries' })
@Index(['tenantId', 'sourceType', 'sourceId'], { unique: true, where: '"source_id" IS NOT NULL' })
@Index(['tenantId', 'createdAt'])
export class EmailDeliveryEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'template_id', type: 'varchar', length: 64 })
  templateId!: string;

  @Column({ name: 'dest_masked', type: 'varchar', length: 160 })
  destMasked!: string;

  @Column({ name: 'dest_hash', type: 'varchar', length: 128 })
  destHash!: string;

  @Column({ type: 'varchar', length: 16, default: 'QUEUED' })
  status!: EmailDeliveryStatus;

  @Column({ type: 'jsonb', default: {} })
  params!: Record<string, unknown>;

  @Column({ name: 'provider_ref', type: 'varchar', length: 64, nullable: true })
  providerRef!: string | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ name: 'source_type', type: 'varchar', length: 32, nullable: true })
  sourceType!: EmailSourceType | null;

  @Column({ name: 'source_id', type: 'varchar', length: 128, nullable: true })
  sourceId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

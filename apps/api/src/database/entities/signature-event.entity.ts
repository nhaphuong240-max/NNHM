import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { SignatureRequestEntity } from './signature-request.entity';

@Entity({ name: 'signature_events' })
@Index(['tenantId', 'requestId', 'occurredAt'])
export class SignatureEventEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'request_id', type: 'varchar', length: 64 })
  requestId!: string;

  @ManyToOne(() => SignatureRequestEntity)
  @JoinColumn({ name: 'request_id' })
  request?: SignatureRequestEntity;

  @Column({ name: 'signer_id', type: 'varchar', length: 64, nullable: true })
  signerId!: string | null;

  @Column({ type: 'varchar', length: 64 })
  action!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip!: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 256, nullable: true })
  userAgent!: string | null;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt!: Date;

  @Column({ type: 'varchar', length: 16, nullable: true })
  channel!: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;
}

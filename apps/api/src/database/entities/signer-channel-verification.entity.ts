import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SignerChannelVerificationStatus = 'PENDING' | 'VERIFIED' | 'FAILED';

@Entity({ name: 'signer_channel_verifications' })
@Index(['tenantId', 'leadId'])
@Index(['tenantId', 'smsDestHash'])
@Index(['tenantId', 'emailDestHash'])
export class SignerChannelVerificationEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'lead_id', type: 'varchar', length: 32 })
  leadId!: string;

  @Column({ name: 'sms_dest_hash', type: 'varchar', length: 128 })
  smsDestHash!: string;

  @Column({ name: 'email_dest_hash', type: 'varchar', length: 128 })
  emailDestHash!: string;

  @Column({ name: 'email_dest_masked', type: 'varchar', length: 160 })
  emailDestMasked!: string;

  @Column({ name: 'code_hash', type: 'varchar', length: 128, nullable: true })
  codeHash!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: SignerChannelVerificationStatus;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount!: number;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { SignatureRequestEntity } from './signature-request.entity';
import { SignatureSignerEntity } from './signature-signer.entity';

/** Hash only. The raw code is never stored. */
@Entity({ name: 'otp_challenges' })
@Index(['tenantId', 'jti', 'createdAt'])
export class EsignOtpChallengeEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'request_id', type: 'varchar', length: 64 })
  requestId!: string;

  @ManyToOne(() => SignatureRequestEntity)
  @JoinColumn({ name: 'request_id' })
  request?: SignatureRequestEntity;

  @Column({ name: 'signer_id', type: 'varchar', length: 64 })
  signerId!: string;

  @ManyToOne(() => SignatureSignerEntity)
  @JoinColumn({ name: 'signer_id' })
  signer?: SignatureSignerEntity;

  @Column({ type: 'varchar', length: 64 })
  jti!: string;

  @Column({ name: 'otp_hash', type: 'varchar', length: 128 })
  otpHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil!: Date | null;

  /** True when attempts are exhausted and no lockout duration is configured. */
  @Column({ name: 'locked_indefinitely', type: 'boolean', default: false })
  lockedIndefinitely!: boolean;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt!: Date | null;

  @Column({ type: 'varchar', length: 16 })
  channel!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

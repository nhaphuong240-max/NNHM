import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'seeker_otp_challenges' })
export class SeekerOtpChallengeEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Index(['tenantId', 'phoneNormalized'])
  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'phone_normalized', type: 'varchar', length: 32 })
  phoneNormalized!: string;

  @Column({ name: 'code_hash', type: 'varchar', length: 128 })
  codeHash!: string;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'signature_signers' })
@Index(['jti'], { unique: true })
@Index(['tenantId', 'requestId'])
export class SignatureSignerEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ name: 'request_id', type: 'varchar', length: 64 })
  requestId!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'party_type', type: 'varchar', length: 32 })
  partyType!: string;

  @Column({ name: 'subject_id', type: 'varchar', length: 64, nullable: true })
  subjectId!: string | null;

  @Column({ name: 'display_name', type: 'varchar', length: 160, nullable: true })
  displayName!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  title!: string | null;

  @Column({ type: 'varchar', length: 16 })
  channel!: string;

  @Column({ name: 'channel_dest_hash', type: 'varchar', length: 128, nullable: true })
  channelDestHash!: string | null;

  @Column({ name: 'channel_dest_masked', type: 'varchar', length: 80, nullable: true })
  channelDestMasked!: string | null;

  @Column({ name: 'sign_order', type: 'int', default: 1 })
  signOrder!: number;

  @Column({ name: 'group_id', type: 'varchar', length: 64, nullable: true })
  groupId!: string | null;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ type: 'varchar', length: 64 })
  jti!: string;

  @Column({ name: 'jti_consumed_at', type: 'timestamptz', nullable: true })
  jtiConsumedAt!: Date | null;

  @Column({ name: 'signed_at', type: 'timestamptz', nullable: true })
  signedAt!: Date | null;

  @Column({ name: 'consent_at', type: 'timestamptz', nullable: true })
  consentAt!: Date | null;

  @Column({ name: 'signature_ref', type: 'varchar', length: 128, nullable: true })
  signatureRef!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

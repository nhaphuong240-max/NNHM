import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type KycSubjectType = 'USER' | 'AGENCY' | 'TENANT';
export type KycStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

@Entity({ name: 'kyc_profiles' })
@Index(['tenantId', 'subjectType', 'subjectId'], { unique: true })
export class KycProfileEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'subject_type', type: 'varchar', length: 16 })
  subjectType!: KycSubjectType;

  @Column({ name: 'subject_id', type: 'varchar', length: 32 })
  subjectId!: string;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: KycStatus;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'external_ref', type: 'varchar', length: 128, nullable: true })
  externalRef!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  provider!: string | null;

  @Column({ name: 'verification_level', type: 'varchar', length: 32, nullable: true })
  verificationLevel!: string | null;

  @Column({ name: 'document_type', type: 'varchar', length: 32, nullable: true })
  documentType!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type LeadRegistrationStatus =
  | 'ACCEPTED'
  | 'EXISTING_PROTECTED'
  | 'EXISTING_ELIGIBLE'
  | 'PENDING_REVIEW'
  | 'CONFLICT'
  | 'REJECTED'
  | 'EXPIRED';

@Entity({ name: 'lead_registrations' })
export class LeadRegistrationEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Index(['tenantId', 'phoneNormalized', 'projectId'])
  @Column({ name: 'phone_normalized', type: 'varchar', length: 32 })
  phoneNormalized!: string;

  @Column({ type: 'varchar', length: 32 })
  phone!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 128 })
  fullName!: string;

  @Column({ name: 'project_id', type: 'varchar', length: 32 })
  projectId!: string;

  @Column({ name: 'unit_id', type: 'varchar', length: 32, nullable: true })
  unitId!: string | null;

  @Column({ name: 'lead_id', type: 'varchar', length: 32, nullable: true })
  leadId!: string | null;

  @Column({ name: 'registered_by', type: 'varchar', length: 32 })
  registeredBy!: string;

  @Column({ name: 'registered_by_org_id', type: 'varchar', length: 32, nullable: true })
  registeredByOrgId!: string | null;

  @Column({ type: 'varchar', length: 24, default: 'ACCEPTED' })
  status!: LeadRegistrationStatus;

  @Column({ name: 'protected_until', type: 'timestamptz' })
  protectedUntil!: Date;

  @Column({ type: 'varchar', length: 16, default: 'buy' })
  intent!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

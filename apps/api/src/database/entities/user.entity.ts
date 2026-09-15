import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TenantEntity } from './tenant.entity';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 64 })
  role!: string;

  /** Wave 0 ABAC — agency / partner org within tenant */
  @Column({ name: 'organization_id', type: 'varchar', length: 32, nullable: true })
  organizationId!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  /** P2 FR-REV-002 — partner routing score (0–100) */
  @Column({ name: 'partner_score', type: 'int', default: 50 })
  partnerScore!: number;

  /** Phase B FR-LEAD-003b — routing skill tags */
  @Column({ name: 'skill_tags', type: 'jsonb', default: () => "'[]'" })
  skillTags!: string[];

  /** Base32 TOTP secret — UC-ID-03 staging MFA (when MFA_SANDBOX=false) */
  @Column({ name: 'mfa_secret', type: 'varchar', length: 64, nullable: true })
  mfaSecret!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.users)
  @JoinColumn({ name: 'tenant_id' })
  tenant?: TenantEntity;
}

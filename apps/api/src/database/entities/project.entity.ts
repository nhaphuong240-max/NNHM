import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { UnitEntity } from './unit.entity';

@Entity({ name: 'projects' })
export class ProjectEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 32 })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  district!: string | null;

  /** P0 FR-SRCH-007 — Golden Record geo (beachhead pilot) */
  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitude!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitude!: string | null;

  /** P0 §0.2(8) — optional deal-protection override per project */
  @Column({ name: 'demand_policy_override', type: 'jsonb', nullable: true })
  demandPolicyOverride!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.projects)
  @JoinColumn({ name: 'tenant_id' })
  tenant?: TenantEntity;

  @OneToMany(() => UnitEntity, (unit) => unit.project)
  units?: UnitEntity[];
}

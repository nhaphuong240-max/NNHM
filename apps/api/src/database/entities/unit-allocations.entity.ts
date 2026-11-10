import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { DistributionAgreementEntity } from './distribution-agreements.entity';
import { UnitEntity } from './unit.entity';

@Entity({ name: 'unit_allocations' })
@Index(['tenantId', 'agreementId', 'unitId'], { unique: true })
export class UnitAllocationEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'agreement_id', type: 'varchar', length: 32 })
  agreementId!: string;

  @ManyToOne(() => DistributionAgreementEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'agreement_id' })
  agreement?: DistributionAgreementEntity;

  @Column({ name: 'unit_id', type: 'varchar', length: 32 })
  unitId!: string;

  @ManyToOne(() => UnitEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id' })
  unit?: UnitEntity;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: false })
  expiresAt!: Date;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

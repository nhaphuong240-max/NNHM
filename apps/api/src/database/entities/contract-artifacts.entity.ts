import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'contract_artifacts' })
@Index(['tenantId', 'bookingId', 'templateVersion'], { unique: true })
export class ContractArtifactEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'booking_id', type: 'varchar', length: 128 })
  bookingId!: string;

  @Column({ name: 'template_version', type: 'varchar', length: 64 })
  templateVersion!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

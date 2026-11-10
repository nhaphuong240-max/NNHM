import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'export_jobs' })
@Index(['tenantId', 'purpose', 'approvedBy'], { unique: true })
export class ExportJobEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'purpose', type: 'varchar', length: 64 })
  purpose!: string;

  @Column({ name: 'approved_by', type: 'varchar', length: 128, nullable: true })
  approvedBy!: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: false })
  expiresAt!: Date;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

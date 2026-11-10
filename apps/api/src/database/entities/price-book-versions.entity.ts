import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'price_book_versions' })
@Index(['tenantId', 'projectId', 'versionNo'], { unique: true })
export class PriceBookVersionEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'project_id', type: 'varchar', length: 128 })
  projectId!: string;

  @Column({ name: 'version_no', type: 'int' })
  versionNo!: number;

  @Column({ name: 'effective_from', type: 'timestamptz', nullable: true })
  effectiveFrom!: Date | null;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  effectiveTo!: Date | null;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

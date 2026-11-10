import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'access_review_items' })
@Index(['tenantId', 'userId', 'roleCode'], { unique: true })
export class AccessReviewItemEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 128 })
  userId!: string;

  @Column({ name: 'role_code', type: 'varchar', length: 64 })
  roleCode!: string;

  @Column({ name: 'reason', type: 'text' })
  reason!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

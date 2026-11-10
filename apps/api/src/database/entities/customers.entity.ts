import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'customers' })
@Index(['tenantId', 'phoneHash', 'displayName'], { unique: true })
export class CustomerEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'phone_hash', type: 'varchar', length: 128 })
  phoneHash!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 128 })
  displayName!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

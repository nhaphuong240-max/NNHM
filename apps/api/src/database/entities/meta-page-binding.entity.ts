import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'meta_page_bindings' })
export class MetaPageBindingEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Index(['pageId'], { unique: true })
  @Column({ name: 'page_id', type: 'varchar', length: 64 })
  pageId!: string;

  @Column({ name: 'page_name', type: 'varchar', length: 128 })
  pageName!: string;

  @Column({ name: 'page_access_token', type: 'text', nullable: true })
  pageAccessToken!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

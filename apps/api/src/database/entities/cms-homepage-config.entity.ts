import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import type { HomepageConfigPayload } from '../../modules/cms/homepage.types';

@Entity({ name: 'cms_homepage_config' })
export class CmsHomepageConfigEntity {
  @PrimaryColumn({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ type: 'jsonb' })
  payload!: HomepageConfigPayload;

  @Column({ name: 'updated_by', type: 'varchar', length: 32, nullable: true })
  updatedBy!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

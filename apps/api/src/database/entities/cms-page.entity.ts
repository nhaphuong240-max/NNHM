import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type CmsPageStatus = 'DRAFT' | 'LEGAL_REVIEW' | 'PUBLISHED';
export type CmsPageType = 'area' | 'project' | 'faq' | 'landing';

@Entity({ name: 'cms_pages' })
export class CmsPageEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 128 })
  slug!: string;

  @Column({ name: 'page_type', type: 'varchar', length: 32 })
  pageType!: CmsPageType;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', default: '' })
  body!: string;

  @Column({ type: 'varchar', length: 16, default: 'DRAFT' })
  status!: CmsPageStatus;

  @Column({ name: 'geo_area_id', type: 'varchar', length: 32, nullable: true })
  geoAreaId!: string | null;

  @Column({ name: 'project_id', type: 'varchar', length: 32, nullable: true })
  projectId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  meta!: Record<string, unknown> | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

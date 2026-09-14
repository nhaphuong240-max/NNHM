import {
  Column,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SearchIndexDetail = {
  listingId: string;
  description: string;
  highlights: string[];
  priceDisplay: number | null;
  floor: number;
  unitStatus: string;
  antiDriftStatus: string;
  projectId: string;
};

@Entity({ name: 'search_index_docs' })
export class SearchIndexDocEntity {
  /** Public search key — unit id */
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Index(['tenantId'])
  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'listing_id', type: 'varchar', length: 32 })
  listingId!: string;

  @Column({ name: 'project_name', type: 'varchar', length: 128 })
  projectName!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 32 })
  code!: string;

  @Column({ name: 'base_price', type: 'numeric', precision: 18, scale: 0 })
  basePrice!: string;

  @Index(['tenantId', 'bedrooms'])
  @Column({ type: 'int' })
  bedrooms!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  area!: string;

  @Column({ type: 'boolean', default: false })
  verified!: boolean;

  @Column({ name: 'verification_level', type: 'varchar', length: 2, default: 'V0' })
  verificationLevel!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  city!: string | null;

  @Index(['tenantId', 'district'])
  @Column({ type: 'varchar', length: 64, nullable: true })
  district!: string | null;

  @Index(['tenantId', 'transactionType'])
  @Column({ name: 'transaction_type', type: 'varchar', length: 16, default: 'sale' })
  transactionType!: 'sale' | 'rent' | 'project';

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitude!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitude!: string | null;

  @Column({ name: 'thumbnail_url', type: 'varchar', length: 512, nullable: true })
  thumbnailUrl!: string | null;

  @Column({ name: 'search_text', type: 'text' })
  searchText!: string;

  @Column({ type: 'jsonb' })
  detail!: SearchIndexDetail;

  @Column({ name: 'indexed_at', type: 'timestamptz' })
  indexedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

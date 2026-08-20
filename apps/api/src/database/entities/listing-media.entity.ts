import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { ListingEntity } from './listing.entity';

export type ListingMediaScanStatus = 'PENDING' | 'CLEAN' | 'QUARANTINE';

@Entity({ name: 'listing_media' })
export class ListingMediaEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'listing_id', type: 'varchar', length: 32 })
  listingId!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 128 })
  mimeType!: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 512 })
  storageKey!: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_cover', type: 'boolean', default: false })
  isCover!: boolean;

  @Column({ name: 'scan_status', type: 'varchar', length: 16, default: 'PENDING' })
  scanStatus!: ListingMediaScanStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => ListingEntity)
  @JoinColumn({ name: 'listing_id' })
  listing?: ListingEntity;
}

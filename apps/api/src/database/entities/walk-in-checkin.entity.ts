import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'walk_in_checkins' })
export class WalkInCheckinEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'gallery_id', type: 'varchar', length: 32 })
  galleryId!: string;

  @Column({ name: 'lead_id', type: 'varchar', length: 32, nullable: true })
  leadId!: string | null;

  @Column({ name: 'full_name', type: 'varchar', length: 255 })
  fullName!: string;

  @Column({ type: 'varchar', length: 32 })
  phone!: string;

  @Column({ name: 'checked_in_by', type: 'varchar', length: 32, nullable: true })
  checkedInBy!: string | null;

  @CreateDateColumn({ name: 'checked_in_at', type: 'timestamptz' })
  checkedInAt!: Date;
}

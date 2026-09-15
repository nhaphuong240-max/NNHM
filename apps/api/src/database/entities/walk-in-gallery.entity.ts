import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'walk_in_galleries' })
export class WalkInGalleryEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'project_id', type: 'varchar', length: 32 })
  projectId!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  token!: string;

  @Column({ name: 'qr_secret', type: 'varchar', length: 64 })
  qrSecret!: string;

  @Column({ type: 'varchar', length: 16, default: 'OPEN' })
  status!: 'OPEN' | 'CLOSED';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

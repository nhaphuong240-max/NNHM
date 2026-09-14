import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

export type DsrPolygonLevel = 'masterplan' | 'tower' | 'floor' | 'unit';

@Entity({ name: 'dsr_polygons' })
export class DsrPolygonEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'project_id', type: 'varchar', length: 32 })
  projectId!: string;

  @Column({ type: 'varchar', length: 16 })
  level!: DsrPolygonLevel;

  @Column({ name: 'ref_id', type: 'varchar', length: 32 })
  refId!: string;

  @Column({ type: 'varchar', length: 128 })
  label!: string;

  @Column({ type: 'jsonb' })
  geojson!: Record<string, unknown>;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { ProjectEntity } from './project.entity';

export type UnitStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'HOLD';

@Entity({ name: 'units' })
export class UnitEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'project_id', type: 'varchar', length: 32 })
  projectId!: string;

  @Column({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'int', nullable: true })
  floor!: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 2 })
  area!: string;

  @Column({ type: 'int' })
  bedrooms!: number;

  @Column({ name: 'base_price', type: 'bigint' })
  basePrice!: string;

  @Column({ type: 'varchar', length: 16 })
  status!: UnitStatus;

  @VersionColumn()
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => ProjectEntity, (project) => project.units)
  @JoinColumn({ name: 'project_id' })
  project?: ProjectEntity;
}

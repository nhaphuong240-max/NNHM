import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { UnitEntity } from './unit.entity';

@Entity({ name: 'projects' })
export class ProjectEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 32 })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.projects)
  @JoinColumn({ name: 'tenant_id' })
  tenant?: TenantEntity;

  @OneToMany(() => UnitEntity, (unit) => unit.project)
  units?: UnitEntity[];
}

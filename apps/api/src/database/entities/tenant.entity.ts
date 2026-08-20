import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { UserEntity } from './user.entity';

export type TenantType = 'DEVELOPER' | 'AGENCY' | 'PLATFORM';

@Entity({ name: 'tenants' })
export class TenantEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 32 })
  type!: TenantType;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => ProjectEntity, (project) => project.tenant)
  projects?: ProjectEntity[];

  @OneToMany(() => UserEntity, (user) => user.tenant)
  users?: UserEntity[];
}

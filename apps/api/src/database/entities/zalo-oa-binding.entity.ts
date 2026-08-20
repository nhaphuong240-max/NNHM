import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'zalo_oa_bindings' })
export class ZaloOaBindingEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Index(['oaId'], { unique: true })
  @Column({ name: 'oa_id', type: 'varchar', length: 64 })
  oaId!: string;

  @Column({ name: 'oa_name', type: 'varchar', length: 128 })
  oaName!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'access_token', type: 'varchar', length: 512, nullable: true })
  accessToken!: string | null;

  @Column({ name: 'refresh_token', type: 'varchar', length: 512, nullable: true })
  refreshToken!: string | null;

  @Column({ name: 'token_expires_at', type: 'timestamptz', nullable: true })
  tokenExpiresAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

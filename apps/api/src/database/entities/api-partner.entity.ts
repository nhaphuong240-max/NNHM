import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiPartnerKeyEntity } from './api-partner-key.entity';

export type ApiPartnerCategory = 'BANK' | 'ERP' | 'NOTARY' | 'VALUATION' | 'OTHER';
export type ApiPartnerStatus = 'REGISTER' | 'SANDBOX' | 'ACTIVE' | 'SUSPENDED';

@Entity({ name: 'api_partners' })
export class ApiPartnerEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Index(['tenantId', 'name'])
  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'varchar', length: 16 })
  category!: ApiPartnerCategory;

  @Column({ type: 'varchar', length: 16, default: 'REGISTER' })
  status!: ApiPartnerStatus;

  @Column({ name: 'webhook_url', type: 'varchar', length: 512, nullable: true })
  webhookUrl!: string | null;

  @Column({ name: 'rate_limit_per_min', type: 'int', default: 60 })
  rateLimitPerMin!: number;

  @Column({ name: 'events_consumed', type: 'int', default: 0 })
  eventsConsumed!: number;

  @OneToMany(() => ApiPartnerKeyEntity, (k) => k.partner, { cascade: true })
  keys!: ApiPartnerKeyEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

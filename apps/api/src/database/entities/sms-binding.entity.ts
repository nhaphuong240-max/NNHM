import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'sms_bindings' })
export class SmsBindingEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 32, default: 'SANDBOX' })
  provider!: string;

  @Column({ name: 'brand_name', type: 'varchar', length: 64 })
  brandName!: string;

  @Column({ name: 'sender_id', type: 'varchar', length: 32, nullable: true })
  senderId!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'api_key', type: 'varchar', length: 128, nullable: true })
  apiKey!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

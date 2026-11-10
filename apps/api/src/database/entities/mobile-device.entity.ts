import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'mobile_devices' })
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'pushToken'], { unique: true })
export class MobileDeviceEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 32 })
  userId!: string;

  @Column({ name: 'push_token', type: 'varchar', length: 256 })
  pushToken!: string;

  @Column({ type: 'varchar', length: 16, default: 'unknown' })
  platform!: string;

  @Column({ name: 'device_name', type: 'varchar', length: 128, nullable: true })
  deviceName!: string | null;

  @Column({ name: 'app_channel', type: 'varchar', length: 16, default: 'AGENT' })
  appChannel!: 'AGENT' | 'BUYER';

  @CreateDateColumn({ name: 'registered_at', type: 'timestamptz' })
  registeredAt!: Date;
}

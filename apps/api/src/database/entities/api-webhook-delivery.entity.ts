import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'api_webhook_deliveries' })
export class ApiWebhookDeliveryEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Index(['tenantId', 'partnerId'])
  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'partner_id', type: 'varchar', length: 32 })
  partnerId!: string;

  @Column({ type: 'varchar', length: 64 })
  event!: string;

  @Column({ type: 'varchar', length: 16 })
  status!: 'DELIVERED' | 'FAILED' | 'RETRY';

  @Column({ name: 'response_code', type: 'int', nullable: true })
  responseCode!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'delivered_at', type: 'timestamptz' })
  deliveredAt!: Date;
}

import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ApiPartnerEntity } from './api-partner.entity';

@Entity({ name: 'api_partner_keys' })
export class ApiPartnerKeyEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Index(['tenantId', 'keyHash'], { unique: true })
  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'partner_id', type: 'varchar', length: 32 })
  partnerId!: string;

  @ManyToOne(() => ApiPartnerEntity, (p) => p.keys, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'partner_id' })
  partner!: ApiPartnerEntity;

  @Column({ name: 'key_hash', type: 'varchar', length: 64 })
  keyHash!: string;

  @Column({ name: 'key_prefix', type: 'varchar', length: 32 })
  keyPrefix!: string;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;
}

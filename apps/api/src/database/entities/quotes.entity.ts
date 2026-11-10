import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'quotes' })
@Index(['tenantId', 'priceBookId', 'unitId', 'quoteHash'], { unique: true })
export class QuoteEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'price_book_id', type: 'varchar', length: 128 })
  priceBookId!: string;

  @Column({ name: 'unit_id', type: 'varchar', length: 128 })
  unitId!: string;

  @Column({ name: 'quote_hash', type: 'varchar', length: 128 })
  quoteHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: false })
  expiresAt!: Date;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

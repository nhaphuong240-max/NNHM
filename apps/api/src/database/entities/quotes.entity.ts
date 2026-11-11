import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { PriceBookVersionEntity } from './price-book-versions.entity';
import { UnitEntity } from './unit.entity';

@Entity({ name: 'quotes' })
@Index(['tenantId', 'priceBookId', 'unitId', 'quoteHash'], { unique: true })
export class QuoteEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'price_book_id', type: 'varchar', length: 32 })
  priceBookId!: string;

  @ManyToOne(() => PriceBookVersionEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'price_book_id' })
  priceBook?: PriceBookVersionEntity;

  @Column({ name: 'unit_id', type: 'varchar', length: 32 })
  unitId!: string;

  @ManyToOne(() => UnitEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id' })
  unit?: UnitEntity;

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

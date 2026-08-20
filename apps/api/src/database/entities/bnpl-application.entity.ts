import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BnplInstallmentEntity } from './bnpl-installment.entity';

export type BnplApplicationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTIVE'
  | 'COMPLETED';

@Entity({ name: 'bnpl_applications' })
export class BnplApplicationEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Index(['tenantId', 'bookingId'])
  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'booking_id', type: 'varchar', length: 32 })
  bookingId!: string;

  @Column({ name: 'plan_label', type: 'varchar', length: 64 })
  planLabel!: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 14, scale: 2 })
  totalAmount!: string;

  @Column({ name: 'installment_count', type: 'int' })
  installmentCount!: number;

  @Column({ type: 'varchar', length: 16 })
  status!: BnplApplicationStatus;

  @Column({ name: 'external_id', type: 'varchar', length: 128, nullable: true })
  externalId!: string | null;

  @Column({ name: 'partner_reason', type: 'varchar', length: 256, nullable: true })
  partnerReason!: string | null;

  @OneToMany(() => BnplInstallmentEntity, (row) => row.application, { cascade: true })
  installments!: BnplInstallmentEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

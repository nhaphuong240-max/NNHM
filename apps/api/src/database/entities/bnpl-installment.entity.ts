import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { BnplApplicationEntity } from './bnpl-application.entity';

export type BnplInstallmentStatus = 'PENDING' | 'PAID' | 'OVERDUE';

@Entity({ name: 'bnpl_installments' })
export class BnplInstallmentEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Index(['tenantId', 'applicationId'])
  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'application_id', type: 'varchar', length: 32 })
  applicationId!: string;

  @ManyToOne(() => BnplApplicationEntity, (app) => app.installments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application!: BnplApplicationEntity;

  @Column({ name: 'due_date', type: 'date' })
  dueDate!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount!: string;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: BnplInstallmentStatus;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;
}

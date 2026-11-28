import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'esign_download_tickets' })
@Index(['tenantId', 'ticketHash'], { unique: true })
export class EsignDownloadTicketEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'ticket_hash', type: 'varchar', length: 64 })
  ticketHash!: string;

  @Column({ name: 'document_id', type: 'varchar', length: 32 })
  documentId!: string;

  @Column({ name: 'signer_id', type: 'varchar', length: 32 })
  signerId!: string;

  @Column({ name: 'contract_id', type: 'varchar', length: 32 })
  contractId!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

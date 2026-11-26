import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** One signing package. Status values are technical; review rules stay unsigned except the role in the plan. */
@Entity({ name: 'signature_requests' })
@Index(['tenantId', 'sourceEntityType', 'sourceEntityId'])
export class SignatureRequestEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 32 })
  tenantId!: string;

  @Column({ name: 'document_type', type: 'varchar', length: 64 })
  documentType!: string;

  @Column({ name: 'template_id', type: 'varchar', length: 64, nullable: true })
  templateId!: string | null;

  @Column({ name: 'source_entity_type', type: 'varchar', length: 32 })
  sourceEntityType!: string;

  @Column({ name: 'source_entity_id', type: 'varchar', length: 64 })
  sourceEntityId!: string;

  @Column({ name: 'contract_id', type: 'varchar', length: 64 })
  contractId!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ name: 'signing_mode', type: 'varchar', length: 32 })
  signingMode!: string;

  @Column({ name: 'document_hash', type: 'varchar', length: 128, nullable: true })
  documentHash!: string | null;

  @Column({ name: 'signed_pdf_document_id', type: 'varchar', length: 64, nullable: true })
  signedPdfDocumentId!: string | null;

  @Column({ name: 'certificate_document_id', type: 'varchar', length: 64, nullable: true })
  certificateDocumentId!: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 64, nullable: true })
  createdBy!: string | null;

  @Column({ name: 'requires_admin_review', type: 'boolean', default: false })
  requiresAdminReview!: boolean;

  @Column({ name: 'reviewed_by', type: 'varchar', length: 64, nullable: true })
  reviewedBy!: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @Column({ name: 'review_decision', type: 'varchar', length: 32, nullable: true })
  reviewDecision!: string | null;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

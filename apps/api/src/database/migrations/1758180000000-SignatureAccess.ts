import { MigrationInterface, QueryRunner } from 'typeorm';
import { ESIGN_TENANT_TABLES, buildRemainingRlsRollback, buildRemainingRlsStatements } from '../rls/tenant-scoped-tables';

/** Signing tables for batch 1. Does not alter tables that already exist on main. */
export class SignatureAccess1758180000000 implements MigrationInterface {
  name = 'SignatureAccess1758180000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "signature_requests" (
        "id" varchar(64) NOT NULL,
        "tenant_id" varchar(32) NOT NULL,
        "document_type" varchar(64) NOT NULL,
        "template_id" varchar(64),
        "source_entity_type" varchar(32) NOT NULL,
        "source_entity_id" varchar(64) NOT NULL,
        "contract_id" varchar(64) NOT NULL,
        "status" varchar(32) NOT NULL,
        "signing_mode" varchar(32) NOT NULL,
        "document_hash" varchar(128),
        "signed_pdf_document_id" varchar(64),
        "certificate_document_id" varchar(64),
        "expires_at" timestamptz NOT NULL,
        "created_by" varchar(64),
        "requires_admin_review" boolean NOT NULL DEFAULT false,
        "reviewed_by" varchar(64),
        "reviewed_at" timestamptz,
        "review_decision" varchar(32),
        "review_notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_signature_requests" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_signature_requests_source" ON "signature_requests" ("tenant_id", "source_entity_type", "source_entity_id")
    `);
    await queryRunner.query(`
      CREATE TABLE "signature_signers" (
        "id" varchar(64) NOT NULL,
        "request_id" varchar(64) NOT NULL,
        "tenant_id" varchar(32) NOT NULL,
        "party_type" varchar(32) NOT NULL,
        "subject_id" varchar(64),
        "display_name" varchar(160),
        "title" varchar(80),
        "channel" varchar(16) NOT NULL,
        "channel_dest_hash" varchar(128),
        "channel_dest_masked" varchar(80),
        "sign_order" integer NOT NULL DEFAULT 1,
        "group_id" varchar(64),
        "status" varchar(32) NOT NULL,
        "jti" varchar(64) NOT NULL,
        "jti_consumed_at" timestamptz,
        "signed_at" timestamptz,
        "consent_at" timestamptz,
        "signature_ref" varchar(128),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_signature_signers" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_signature_signers_jti" UNIQUE ("jti"),
        CONSTRAINT "FK_signature_signers_request" FOREIGN KEY ("request_id") REFERENCES "signature_requests"("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_signature_signers_request" ON "signature_signers" ("tenant_id", "request_id")
    `);
    await queryRunner.query(`
      CREATE TABLE "otp_challenges" (
        "id" varchar(64) NOT NULL,
        "tenant_id" varchar(32) NOT NULL,
        "request_id" varchar(64) NOT NULL,
        "signer_id" varchar(64) NOT NULL,
        "jti" varchar(64) NOT NULL,
        "otp_hash" varchar(128) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "locked_until" timestamptz,
        "locked_indefinitely" boolean NOT NULL DEFAULT false,
        "consumed_at" timestamptz,
        "channel" varchar(16) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_otp_challenges" PRIMARY KEY ("id"),
        CONSTRAINT "FK_otp_challenges_request" FOREIGN KEY ("request_id") REFERENCES "signature_requests"("id"),
        CONSTRAINT "FK_otp_challenges_signer" FOREIGN KEY ("signer_id") REFERENCES "signature_signers"("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_otp_challenges_jti" ON "otp_challenges" ("tenant_id", "jti", "created_at")
    `);
    await queryRunner.query(`
      CREATE TABLE "signature_events" (
        "id" varchar(64) NOT NULL,
        "tenant_id" varchar(32) NOT NULL,
        "request_id" varchar(64) NOT NULL,
        "signer_id" varchar(64),
        "action" varchar(64) NOT NULL,
        "ip" varchar(64),
        "user_agent" varchar(256),
        "occurred_at" timestamptz NOT NULL,
        "channel" varchar(16),
        "metadata" jsonb NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_signature_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_signature_events_request" FOREIGN KEY ("request_id") REFERENCES "signature_requests"("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_signature_events_request" ON "signature_events" ("tenant_id", "request_id", "occurred_at")
    `);
    for (const statement of buildRemainingRlsStatements(ESIGN_TENANT_TABLES)) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of buildRemainingRlsRollback(ESIGN_TENANT_TABLES)) {
      await queryRunner.query(statement);
    }
    await queryRunner.query(`DROP TABLE "signature_events"`);
    await queryRunner.query(`DROP TABLE "otp_challenges"`);
    await queryRunner.query(`DROP TABLE "signature_signers"`);
    await queryRunner.query(`DROP TABLE "signature_requests"`);
  }
}

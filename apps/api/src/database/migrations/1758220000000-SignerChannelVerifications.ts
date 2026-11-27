import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  ESIGN_CHANNEL_VERIFY_TABLES,
  buildRemainingRlsRollback,
  buildRemainingRlsStatements,
} from '../rls/tenant-scoped-tables';

/** Phone → CRM lead email code → VERIFIED channel. Does not alter tables that already exist on main. */
export class SignerChannelVerifications1758220000000 implements MigrationInterface {
  name = 'SignerChannelVerifications1758220000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "signer_channel_verifications" (
        "id" varchar(32) NOT NULL,
        "tenant_id" varchar(32) NOT NULL,
        "lead_id" varchar(32) NOT NULL,
        "sms_dest_hash" varchar(128) NOT NULL,
        "email_dest_hash" varchar(128) NOT NULL,
        "email_dest_masked" varchar(160) NOT NULL,
        "code_hash" varchar(128),
        "status" varchar(16) NOT NULL DEFAULT 'PENDING',
        "expires_at" timestamptz NOT NULL,
        "attempt_count" int NOT NULL DEFAULT 0,
        "verified_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_signer_channel_verifications" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_scv_lead" ON "signer_channel_verifications" ("tenant_id", "lead_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_scv_sms_hash" ON "signer_channel_verifications" ("tenant_id", "sms_dest_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_scv_email_hash" ON "signer_channel_verifications" ("tenant_id", "email_dest_hash")`,
    );
    for (const statement of buildRemainingRlsStatements(ESIGN_CHANNEL_VERIFY_TABLES)) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of buildRemainingRlsRollback(ESIGN_CHANNEL_VERIFY_TABLES)) {
      await queryRunner.query(statement);
    }
    await queryRunner.query(`DROP TABLE "signer_channel_verifications"`);
  }
}

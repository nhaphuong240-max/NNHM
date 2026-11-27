import { MigrationInterface, QueryRunner } from 'typeorm';
import { ESIGN_LINK_TENANT_TABLES, buildRemainingRlsRollback, buildRemainingRlsStatements } from '../rls/tenant-scoped-tables';

/** Email outbox for sign-link and e-sign OTP. Does not alter tables that already exist on main. */
export class EmailDeliveries1758210000000 implements MigrationInterface {
  name = 'EmailDeliveries1758210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "email_deliveries" (
        "id" varchar(32) NOT NULL,
        "tenant_id" varchar(32) NOT NULL,
        "template_id" varchar(64) NOT NULL,
        "dest_masked" varchar(160) NOT NULL,
        "dest_hash" varchar(128) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'QUEUED',
        "params" jsonb NOT NULL DEFAULT '{}',
        "provider_ref" varchar(64),
        "last_error" text,
        "source_type" varchar(32),
        "source_id" varchar(128),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_deliveries" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_email_deliveries_source"
      ON "email_deliveries" ("tenant_id", "source_type", "source_id")
      WHERE "source_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_email_deliveries_created" ON "email_deliveries" ("tenant_id", "created_at")
    `);
    for (const statement of buildRemainingRlsStatements(ESIGN_LINK_TENANT_TABLES)) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of buildRemainingRlsRollback(ESIGN_LINK_TENANT_TABLES)) {
      await queryRunner.query(statement);
    }
    await queryRunner.query(`DROP TABLE "email_deliveries"`);
  }
}

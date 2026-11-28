import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  ESIGN_DOWNLOAD_TICKET_TABLES,
  buildRemainingRlsRollback,
  buildRemainingRlsStatements,
} from '../rls/tenant-scoped-tables';

/** One-time hashed download tickets. TTL comes from ESIGN_DOWNLOAD_TTL_MS; empty env does not mint. */
export class EsignDownloadTickets1758250000000 implements MigrationInterface {
  name = 'EsignDownloadTickets1758250000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "esign_download_tickets" (
        "id" varchar(32) NOT NULL,
        "tenant_id" varchar(32) NOT NULL,
        "ticket_hash" varchar(64) NOT NULL,
        "document_id" varchar(32) NOT NULL,
        "signer_id" varchar(32) NOT NULL,
        "contract_id" varchar(32) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "consumed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_esign_download_tickets" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_esign_download_tickets_hash" ON "esign_download_tickets" ("tenant_id", "ticket_hash")`,
    );
    for (const statement of buildRemainingRlsStatements(ESIGN_DOWNLOAD_TICKET_TABLES)) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of buildRemainingRlsRollback(ESIGN_DOWNLOAD_TICKET_TABLES)) {
      await queryRunner.query(statement);
    }
    await queryRunner.query(`DROP TABLE "esign_download_tickets"`);
  }
}

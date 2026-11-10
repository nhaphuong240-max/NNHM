import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  REMAINING_TENANT_ID_TABLES,
  buildRemainingRlsRollback,
  buildRemainingRlsStatements,
} from '../rls/tenant-scoped-tables';

/**
 * RLS for the 22 tenant tables created after 1738339201000.
 * Does not edit that migration. A missing table stops the migration.
 * down() reverses the token prefix, then DROP POLICY, NO FORCE, and DISABLE ROW LEVEL SECURITY.
 */
export class EnableRemainingTenantRls1758130000000 implements MigrationInterface {
  name = 'EnableRemainingTenantRls1758130000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const names = [...REMAINING_TENANT_ID_TABLES];
    const present: Array<{ table_name: string }> = await queryRunner.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [names],
    );
    const found = new Set(present.map((row) => row.table_name));
    const missing = names.filter((name) => !found.has(name));
    if (missing.length) {
      throw new Error(`remaining tenant rls refused: these tables are missing: ${missing.join(', ')}`);
    }

    await queryRunner.query(`
      UPDATE "dsr_share_links"
      SET "token" = 'v1.' || "tenant_id" || '.' || "token"
      WHERE "token" NOT LIKE 'v1.%'
    `);
    await queryRunner.query(`
      UPDATE "walk_in_galleries"
      SET "token" = 'v1.' || "tenant_id" || '.' || "token"
      WHERE "token" NOT LIKE 'v1.%'
    `);
    await queryRunner.query(`
      UPDATE "open_day_rsvps"
      SET "qr_token" = 'v1.' || "tenant_id" || '.' || "qr_token"
      WHERE "qr_token" NOT LIKE 'v1.%'
    `);

    for (const statement of buildRemainingRlsStatements(names)) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "dsr_share_links"
      SET "token" = substr("token", length('v1.' || "tenant_id" || '.') + 1)
      WHERE "token" LIKE 'v1.' || "tenant_id" || '.%'
    `);
    await queryRunner.query(`
      UPDATE "walk_in_galleries"
      SET "token" = substr("token", length('v1.' || "tenant_id" || '.') + 1)
      WHERE "token" LIKE 'v1.' || "tenant_id" || '.%'
    `);
    await queryRunner.query(`
      UPDATE "open_day_rsvps"
      SET "qr_token" = substr("qr_token", length('v1.' || "tenant_id" || '.') + 1)
      WHERE "qr_token" LIKE 'v1.' || "tenant_id" || '.%'
    `);
    for (const statement of buildRemainingRlsRollback(REMAINING_TENANT_ID_TABLES)) {
      await queryRunner.query(statement);
    }
  }
}

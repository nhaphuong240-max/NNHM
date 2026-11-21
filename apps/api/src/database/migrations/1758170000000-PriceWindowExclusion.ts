import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Two effective windows for the same tenant and project cannot overlap.
 * The extension stays after down() because another migration may use it.
 */
export class PriceWindowExclusion1758170000000 implements MigrationInterface {
  name = 'PriceWindowExclusion1758170000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);
    await queryRunner.query(`
      ALTER TABLE "price_book_versions"
      ADD CONSTRAINT "excl_price_book_windows"
      EXCLUDE USING gist (
        "tenant_id" WITH =,
        "project_id" WITH =,
        tstzrange("effective_from", "effective_to", '[)') WITH &&
      )
      WHERE ("effective_from" IS NOT NULL)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "price_book_versions" DROP CONSTRAINT "excl_price_book_windows"
    `);
  }
}

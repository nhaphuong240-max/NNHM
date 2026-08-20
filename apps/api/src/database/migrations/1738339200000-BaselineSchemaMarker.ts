import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline marker for databases created via TypeORM synchronize before T7-S1.
 * Schema is already present in dev/staging; this migration only records history.
 */
export class BaselineSchemaMarker1738339200000 implements MigrationInterface {
  name = 'BaselineSchemaMarker1738339200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      COMMENT ON SCHEMA public IS 'WEREAL baseline — pre-T7 synchronize schema (T7-S1 marker)';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      COMMENT ON SCHEMA public IS NULL;
    `);
  }
}

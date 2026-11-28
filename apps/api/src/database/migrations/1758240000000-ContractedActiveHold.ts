import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CONTRACTED still occupies the unit until a later unsigned status exists.
 * Owner has not signed CLOSED; this keeps the hold unique across RESERVED/DEPOSITED/CONTRACTED.
 */
export class ContractedActiveHold1758240000000 implements MigrationInterface {
  name = 'ContractedActiveHold1758240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const duplicates: Array<{ unit_id: string }> = await queryRunner.query(`
      SELECT unit_id
      FROM bookings
      WHERE status IN ('RESERVED', 'DEPOSITED', 'CONTRACTED')
      GROUP BY unit_id
      HAVING COUNT(*) > 1
    `);
    if (duplicates.length) {
      throw new Error(
        `contracted active hold unique refused: duplicates ${duplicates.map((row) => row.unit_id).join(', ')}`,
      );
    }
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_bookings_active_hold"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_bookings_active_hold" ON "bookings" ("unit_id") WHERE status IN ('RESERVED', 'DEPOSITED', 'CONTRACTED')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_bookings_active_hold"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_bookings_active_hold" ON "bookings" ("unit_id") WHERE status IN ('RESERVED', 'DEPOSITED')`,
    );
  }
}

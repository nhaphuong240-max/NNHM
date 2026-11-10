import { MigrationInterface, QueryRunner } from 'typeorm';

/** One active hold per unit across tenants. Stops when duplicates already exist. */
export class ActiveHoldUnique1758150000000 implements MigrationInterface {
  name = 'ActiveHoldUnique1758150000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const duplicates: Array<{ unit_id: string }> = await queryRunner.query(`
      SELECT unit_id
      FROM bookings
      WHERE status IN ('RESERVED', 'DEPOSITED')
      GROUP BY unit_id
      HAVING COUNT(*) > 1
    `);
    if (duplicates.length) {
      throw new Error(
        `active hold unique refused: duplicates ${duplicates.map((row) => row.unit_id).join(', ')}`,
      );
    }
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_bookings_active_hold" ON "bookings" ("unit_id") WHERE status IN ('RESERVED', 'DEPOSITED')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "uq_bookings_active_hold"`);
  }
}

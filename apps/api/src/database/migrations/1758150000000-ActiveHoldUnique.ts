import { MigrationInterface, QueryRunner } from 'typeorm';

/** One active hold per unit. Stops when duplicates already exist. */
export class ActiveHoldUnique1758150000000 implements MigrationInterface {
  name = 'ActiveHoldUnique1758150000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const duplicates: Array<{ tenant_id: string; unit_id: string }> = await queryRunner.query(`
      SELECT tenant_id, unit_id
      FROM bookings
      WHERE status IN ('RESERVED', 'DEPOSITED')
      GROUP BY tenant_id, unit_id
      HAVING COUNT(*) > 1
    `);
    if (duplicates.length) {
      throw new Error(
        `active hold unique refused: duplicates ${duplicates
          .map((row) => `${row.tenant_id}/${row.unit_id}`)
          .join(', ')}`,
      );
    }
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_bookings_active_hold" ON "bookings" ("tenant_id", "unit_id") WHERE status IN ('RESERVED', 'DEPOSITED')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "uq_bookings_active_hold"`);
  }
}

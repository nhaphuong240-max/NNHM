import { MigrationInterface, QueryRunner } from 'typeorm';

/** T7-S4 — GR unit.version bind at booking/listing commit time. */
export class AddUnitVersionBind1738339202000 implements MigrationInterface {
  name = 'AddUnitVersionBind1738339202000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS unit_version integer NOT NULL DEFAULT 1
    `);
    await queryRunner.query(`
      ALTER TABLE listings
      ADD COLUMN IF NOT EXISTS unit_version integer NOT NULL DEFAULT 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE bookings DROP COLUMN IF EXISTS unit_version`);
    await queryRunner.query(`ALTER TABLE listings DROP COLUMN IF EXISTS unit_version`);
  }
}

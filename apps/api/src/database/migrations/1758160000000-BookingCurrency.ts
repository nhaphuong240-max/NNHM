import { MigrationInterface, QueryRunner } from 'typeorm';

/** Server-owned payment currency. Existing rows receive VND. Clients cannot choose it. */
export class BookingCurrency1758160000000 implements MigrationInterface {
  name = 'BookingCurrency1758160000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "currency" varchar(3) NOT NULL DEFAULT 'VND'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "currency"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/** CONTRACTED is allowed after signatures + review. Does not add CLOSED. */
export class BookingContractedStatus1758230000000 implements MigrationInterface {
  name = 'BookingContractedStatus1758230000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      COMMENT ON COLUMN "bookings"."status" IS 'RESERVED|DEPOSITED|EXPIRED|CANCELLED|REFUNDED|CONTRACTED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`COMMENT ON COLUMN "bookings"."status" IS NULL`);
  }
}

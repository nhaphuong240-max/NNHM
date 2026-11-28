import { MigrationInterface, QueryRunner } from 'typeorm';

/** One SIGNED event per signer on a signature request. Does not change tables that already exist on main. */
export class SignatureSignedOnce1758200000000 implements MigrationInterface {
  name = 'SignatureSignedOnce1758200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_signature_events_one_signed"
      ON "signature_events" ("request_id", "signer_id")
      WHERE (("action")::text = 'SIGNED'::text)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_signature_events_one_signed"`);
  }
}

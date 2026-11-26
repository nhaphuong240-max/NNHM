import { QueryRunner } from 'typeorm';

/**
 * Not registered with TypeORM. migrations/ is the only folder that runs.
 * Move this file there only after the owner approves masking historical rows.
 * It clears params.otp on e-sign deliveries and does not delete rows.
 */
export class MaskEsignDeliveryOtp1758190000000 {
  name = 'MaskEsignDeliveryOtp1758190000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "sms_deliveries"
      SET "params" = "params" - 'otp'
      WHERE "source_type" = 'ESIGN_OTP'
        AND "params" ? 'otp'
    `);
  }

  public async down(): Promise<void> {
    // The plaintext is not retained, so the mask cannot be reversed.
  }
}

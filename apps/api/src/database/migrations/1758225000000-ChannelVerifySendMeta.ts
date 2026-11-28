import { MigrationInterface, QueryRunner } from 'typeorm';

/** Cooldown is last_sent_at. Resends increment send_count toward ESIGN_OTP_MAX_SENDS. */
export class ChannelVerifySendMeta1758225000000 implements MigrationInterface {
  name = 'ChannelVerifySendMeta1758225000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "signer_channel_verifications" ADD COLUMN IF NOT EXISTS "last_sent_at" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "signer_channel_verifications" ADD COLUMN IF NOT EXISTS "send_count" int NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "signer_channel_verifications" DROP COLUMN IF EXISTS "send_count"`);
    await queryRunner.query(`ALTER TABLE "signer_channel_verifications" DROP COLUMN IF EXISTS "last_sent_at"`);
  }
}

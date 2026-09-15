import { MigrationInterface, QueryRunner } from 'typeorm';

/** Phase C — walk-in gallery QR, chat capture rails, buyer portal seeker scope. */
export class PhaseC1758110000000 implements MigrationInterface {
  name = 'PhaseC1758110000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS walk_in_galleries (
        id varchar(32) PRIMARY KEY,
        tenant_id varchar(32) NOT NULL,
        project_id varchar(32) NOT NULL,
        title varchar(255) NOT NULL,
        token varchar(64) NOT NULL UNIQUE,
        qr_secret varchar(64) NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'OPEN',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS walk_in_checkins (
        id varchar(32) PRIMARY KEY,
        tenant_id varchar(32) NOT NULL,
        gallery_id varchar(32) NOT NULL,
        lead_id varchar(32),
        full_name varchar(255) NOT NULL,
        phone varchar(32) NOT NULL,
        checked_in_by varchar(32),
        checked_in_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_walk_in_checkins_gallery
      ON walk_in_checkins (tenant_id, gallery_id, checked_in_at DESC)
    `);

    await queryRunner.query(`
      INSERT INTO walk_in_galleries (id, tenant_id, project_id, title, token, qr_secret, status)
      VALUES (
        'wig_sunrise_01', 'ten_dev_01', 'prj_sunrise',
        'Sunrise Tower — Sales Gallery',
        'wig_sunrise_gallery_v1',
        'sec_wig_sunrise_v1',
        'OPEN'
      )
      ON CONFLICT (id) DO NOTHING
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    /* optional tables — no destructive rollback */
  }
}

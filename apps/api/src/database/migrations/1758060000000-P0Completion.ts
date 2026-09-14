import { MigrationInterface, QueryRunner } from 'typeorm';

/** P0 §0.2 completion — GR map coords, viewing reminders, per-project policy. */
export class P0Completion1758060000000 implements MigrationInterface {
  name = 'P0Completion1758060000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS latitude numeric(10,7),
      ADD COLUMN IF NOT EXISTS longitude numeric(10,7),
      ADD COLUMN IF NOT EXISTS demand_policy_override jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE search_index_docs
      ADD COLUMN IF NOT EXISTS latitude numeric(10,7),
      ADD COLUMN IF NOT EXISTS longitude numeric(10,7)
    `);

    await queryRunner.query(`
      ALTER TABLE crm_viewings
      ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz
    `);

    await queryRunner.query(`
      UPDATE projects SET latitude = 10.7297, longitude = 106.7219
      WHERE id = 'prj_sunrise' AND latitude IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE crm_viewings DROP COLUMN IF EXISTS reminder_sent_at
    `);
    await queryRunner.query(`
      ALTER TABLE search_index_docs DROP COLUMN IF EXISTS latitude, DROP COLUMN IF EXISTS longitude
    `);
    await queryRunner.query(`
      ALTER TABLE projects
      DROP COLUMN IF EXISTS demand_policy_override,
      DROP COLUMN IF EXISTS longitude,
      DROP COLUMN IF EXISTS latitude
    `);
  }
}

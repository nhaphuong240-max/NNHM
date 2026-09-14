import { MigrationInterface, QueryRunner } from 'typeorm';

/** Wave P2 — health score, routing suggestions, lead copilot drafts, partner score. */
export class P2Wave1758080000000 implements MigrationInterface {
  name = 'P2Wave1758080000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS health_score int,
      ADD COLUMN IF NOT EXISTS health_meta jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS partner_score int NOT NULL DEFAULT 50
    `);

    await queryRunner.query(`
      UPDATE users SET partner_score = 75
      WHERE role = 'AGENT' AND organization_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS crm_routing_suggestions (
        id varchar(32) PRIMARY KEY,
        tenant_id varchar(32) NOT NULL,
        lead_id varchar(32) NOT NULL,
        suggested_agent_id varchar(32) NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'PENDING',
        reason jsonb NOT NULL DEFAULT '{}',
        partner_score int,
        inventory_aging_days int,
        reviewed_by varchar(32),
        reviewed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_routing_suggestions_tenant_status
      ON crm_routing_suggestions (tenant_id, status)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_lead_copilot_drafts (
        id varchar(32) PRIMARY KEY,
        tenant_id varchar(32) NOT NULL,
        lead_id varchar(32) NOT NULL,
        summary text NOT NULL,
        next_actions jsonb NOT NULL DEFAULT '[]',
        status varchar(16) NOT NULL DEFAULT 'PENDING',
        requires_approval boolean NOT NULL DEFAULT true,
        model_version varchar(32) NOT NULL,
        approved_by varchar(32),
        approved_at timestamptz,
        created_by varchar(32),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_copilot_drafts_lead
      ON ai_lead_copilot_drafts (tenant_id, lead_id, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ai_lead_copilot_drafts`);
    await queryRunner.query(`DROP TABLE IF EXISTS crm_routing_suggestions`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS partner_score`);
    await queryRunner.query(`
      ALTER TABLE leads
      DROP COLUMN IF EXISTS health_score,
      DROP COLUMN IF EXISTS health_meta
    `);
  }
}

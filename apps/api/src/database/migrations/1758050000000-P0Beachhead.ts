import { MigrationInterface, QueryRunner } from 'typeorm';

/** P0 Beachhead — search truth, analytics, routing persist, seeker OTP, HOT SLA, disputes. */
export class P0Beachhead1758050000000 implements MigrationInterface {
  name = 'P0Beachhead1758050000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE listings
      ADD COLUMN IF NOT EXISTS transaction_type varchar(16) NOT NULL DEFAULT 'sale',
      ADD COLUMN IF NOT EXISTS freshness_paused_at timestamptz
    `);

    await queryRunner.query(`
      ALTER TABLE search_index_docs
      ADD COLUMN IF NOT EXISTS transaction_type varchar(16) NOT NULL DEFAULT 'sale'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id varchar(32) PRIMARY KEY,
        tenant_id varchar(32) NOT NULL,
        name varchar(64) NOT NULL,
        source varchar(32) NOT NULL,
        consent_basis varchar(32) NOT NULL DEFAULT 'legitimate_interest',
        session_id varchar(64),
        visitor_id varchar(64),
        user_id varchar(32),
        entity_type varchar(32),
        entity_id varchar(32),
        payload jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant_name ON analytics_events (tenant_id, name, created_at DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS crm_routing_rules (
        tenant_id varchar(32) NOT NULL,
        project_id varchar(32) NOT NULL DEFAULT '',
        rules jsonb NOT NULL,
        enabled boolean NOT NULL DEFAULT true,
        updated_by varchar(32),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (tenant_id, project_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS seeker_otp_challenges (
        id varchar(32) PRIMARY KEY,
        tenant_id varchar(32) NOT NULL,
        phone_normalized varchar(32) NOT NULL,
        code_hash varchar(128) NOT NULL,
        attempts int NOT NULL DEFAULT 0,
        expires_at timestamptz NOT NULL,
        verified_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_seeker_otp_phone ON seeker_otp_challenges (tenant_id, phone_normalized, created_at DESC)`,
    );

    await queryRunner.query(`
      ALTER TABLE saved_searches
      ADD COLUMN IF NOT EXISTS user_id varchar(32),
      ADD COLUMN IF NOT EXISTS alert_opt_out boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS last_alert_at timestamptz,
      ADD COLUMN IF NOT EXISTS alerts_sent_today int NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS first_touch_at timestamptz,
      ADD COLUMN IF NOT EXISTS hot_sla_due_at timestamptz,
      ADD COLUMN IF NOT EXISTS hot_sla_breached boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sla_breach_logs (
        id varchar(32) PRIMARY KEY,
        tenant_id varchar(32) NOT NULL,
        lead_id varchar(32) NOT NULL,
        breach_type varchar(32) NOT NULL,
        due_at timestamptz NOT NULL,
        breached_at timestamptz NOT NULL,
        escalated_to varchar(32),
        actor_id varchar(32),
        payload jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS deal_disputes (
        id varchar(32) PRIMARY KEY,
        tenant_id varchar(32) NOT NULL,
        registration_id varchar(32) NOT NULL,
        project_id varchar(32) NOT NULL,
        status varchar(24) NOT NULL DEFAULT 'OPEN',
        opened_by_org_id varchar(32) NOT NULL,
        opened_by_user_id varchar(32) NOT NULL,
        defending_org_id varchar(32),
        pii_safe_summary text NOT NULL DEFAULT '',
        attribution_key varchar(64),
        sla_due_at timestamptz,
        closed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_deal_disputes_tenant_status ON deal_disputes (tenant_id, status)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS deal_dispute_events (
        id varchar(32) PRIMARY KEY,
        dispute_id varchar(32) NOT NULL,
        from_status varchar(24),
        to_status varchar(24) NOT NULL,
        actor_id varchar(32),
        note text,
        payload jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      UPDATE search_index_docs SET transaction_type = 'sale' WHERE transaction_type IS NULL OR transaction_type = ''
    `);
    await queryRunner.query(`
      UPDATE listings SET transaction_type = 'sale' WHERE transaction_type IS NULL OR transaction_type = ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS deal_dispute_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS deal_disputes`);
    await queryRunner.query(`DROP TABLE IF EXISTS sla_breach_logs`);
    await queryRunner.query(`
      ALTER TABLE leads
      DROP COLUMN IF EXISTS hot_sla_breached,
      DROP COLUMN IF EXISTS hot_sla_due_at,
      DROP COLUMN IF EXISTS first_touch_at
    `);
    await queryRunner.query(`
      ALTER TABLE saved_searches
      DROP COLUMN IF EXISTS alerts_sent_today,
      DROP COLUMN IF EXISTS last_alert_at,
      DROP COLUMN IF EXISTS alert_opt_out,
      DROP COLUMN IF EXISTS user_id
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS seeker_otp_challenges`);
    await queryRunner.query(`DROP TABLE IF EXISTS crm_routing_rules`);
    await queryRunner.query(`DROP TABLE IF EXISTS analytics_events`);
    await queryRunner.query(`
      ALTER TABLE search_index_docs DROP COLUMN IF EXISTS transaction_type
    `);
    await queryRunner.query(`
      ALTER TABLE listings
      DROP COLUMN IF EXISTS freshness_paused_at,
      DROP COLUMN IF EXISTS transaction_type
    `);
  }
}

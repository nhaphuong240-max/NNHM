import { MigrationInterface, QueryRunner } from 'typeorm';

/** Website + CRM demand OS: viewing, lead registration, saved search, lead qualification fields. */
export class WebsiteCrmDemand1757840000000 implements MigrationInterface {
  name = 'WebsiteCrmDemand1757840000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS project_id varchar(32),
      ADD COLUMN IF NOT EXISTS inquiry_type varchar(16),
      ADD COLUMN IF NOT EXISTS requirement jsonb
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS crm_viewings (
        id varchar(32) PRIMARY KEY,
        tenant_id varchar(32) NOT NULL,
        lead_id varchar(32) NOT NULL,
        unit_id varchar(32),
        project_id varchar(32),
        listing_id varchar(32),
        requested_slot timestamptz,
        mode varchar(16) NOT NULL DEFAULT 'CALLBACK',
        status varchar(16) NOT NULL DEFAULT 'REQUESTED',
        outcome varchar(32),
        note text,
        assigned_to varchar(32),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_crm_viewings_tenant_lead ON crm_viewings (tenant_id, lead_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lead_registrations (
        id varchar(32) PRIMARY KEY,
        tenant_id varchar(32) NOT NULL,
        phone_normalized varchar(32) NOT NULL,
        phone varchar(32) NOT NULL,
        full_name varchar(128) NOT NULL,
        project_id varchar(32) NOT NULL,
        unit_id varchar(32),
        lead_id varchar(32),
        registered_by varchar(32) NOT NULL,
        status varchar(24) NOT NULL DEFAULT 'ACCEPTED',
        protected_until timestamptz NOT NULL,
        intent varchar(16) NOT NULL DEFAULT 'buy',
        note text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_lead_registrations_phone_project ON lead_registrations (tenant_id, phone_normalized, project_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS saved_searches (
        id varchar(32) PRIMARY KEY,
        tenant_id varchar(32) NOT NULL,
        visitor_id varchar(64) NOT NULL,
        intent varchar(16) NOT NULL DEFAULT 'buy',
        q varchar(255) NOT NULL DEFAULT '',
        filters jsonb NOT NULL DEFAULT '{}',
        alert_frequency varchar(16) NOT NULL DEFAULT 'none',
        marketing_consent boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_saved_searches_visitor ON saved_searches (tenant_id, visitor_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS saved_searches`);
    await queryRunner.query(`DROP TABLE IF EXISTS lead_registrations`);
    await queryRunner.query(`DROP TABLE IF EXISTS crm_viewings`);
    await queryRunner.query(`
      ALTER TABLE leads
      DROP COLUMN IF EXISTS requirement,
      DROP COLUMN IF EXISTS inquiry_type,
      DROP COLUMN IF EXISTS project_id
    `);
  }
}

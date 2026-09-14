import { MigrationInterface, QueryRunner } from 'typeorm';

/** Wave 0 BA + legal: tenant demand policy, org ABAC columns. */
export class Wave0DemandPolicy1757940000000 implements MigrationInterface {
  name = 'Wave0DemandPolicy1757940000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenant_demand_policies (
        tenant_id varchar(32) PRIMARY KEY,
        version int NOT NULL DEFAULT 1,
        payload jsonb NOT NULL,
        updated_by varchar(32),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS organization_id varchar(32)
    `);

    await queryRunner.query(`
      ALTER TABLE lead_registrations
      ADD COLUMN IF NOT EXISTS registered_by_org_id varchar(32)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lead_registrations DROP COLUMN IF EXISTS registered_by_org_id
    `);
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS organization_id
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS tenant_demand_policies`);
  }
}

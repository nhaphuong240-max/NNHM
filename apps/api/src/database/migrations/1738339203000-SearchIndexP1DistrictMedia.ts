import { MigrationInterface, QueryRunner } from 'typeorm';

/** P1 — marketplace SERP: district/city/thumbnail on search index + project locality. */
export class SearchIndexP1DistrictMedia1738339203000 implements MigrationInterface {
  name = 'SearchIndexP1DistrictMedia1738339203000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS city varchar(64),
      ADD COLUMN IF NOT EXISTS district varchar(64)
    `);
    await queryRunner.query(`
      ALTER TABLE search_index_docs
      ADD COLUMN IF NOT EXISTS city varchar(64),
      ADD COLUMN IF NOT EXISTS district varchar(64),
      ADD COLUMN IF NOT EXISTS thumbnail_url varchar(512)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_index_docs_tenant_district
      ON search_index_docs (tenant_id, district)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_search_index_docs_tenant_district`);
    await queryRunner.query(`
      ALTER TABLE search_index_docs
      DROP COLUMN IF EXISTS thumbnail_url,
      DROP COLUMN IF EXISTS district,
      DROP COLUMN IF EXISTS city
    `);
    await queryRunner.query(`
      ALTER TABLE projects
      DROP COLUMN IF EXISTS district,
      DROP COLUMN IF EXISTS city
    `);
  }
}

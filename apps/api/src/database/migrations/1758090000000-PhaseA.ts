import { MigrationInterface, QueryRunner } from 'typeorm';

/** Phase A — backfill GR map coords on search index from projects. */
export class PhaseA1758090000000 implements MigrationInterface {
  name = 'PhaseA1758090000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE projects SET latitude = 10.7297, longitude = 106.7219
      WHERE id = 'prj_sunrise' AND (latitude IS NULL OR longitude IS NULL)
    `);

    await queryRunner.query(`
      UPDATE search_index_docs d
      SET
        latitude = p.latitude + ((hashtext(d.id)::bigint % 100) - 50) * 0.00001,
        longitude = p.longitude + ((hashtext(d.code)::bigint % 100) - 50) * 0.00001,
        updated_at = now()
      FROM listings l
      JOIN units u ON u.id = l.unit_id
      JOIN projects p ON p.id = u.project_id
      WHERE d.listing_id = l.id
        AND d.tenant_id = l.tenant_id
        AND p.latitude IS NOT NULL
        AND p.longitude IS NOT NULL
        AND (d.latitude IS NULL OR d.longitude IS NULL)
    `);

    await queryRunner.query(`
      UPDATE geo_areas ga
      SET listing_count = sub.cnt, updated_at = now()
      FROM (
        SELECT tenant_id, district, COUNT(*)::int AS cnt
        FROM search_index_docs
        WHERE district IS NOT NULL
        GROUP BY tenant_id, district
      ) sub
      WHERE ga.tenant_id = sub.tenant_id AND ga.label = sub.district
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    /* data backfill — no schema rollback */
  }
}

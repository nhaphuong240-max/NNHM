import { MigrationInterface, QueryRunner } from 'typeorm';

/** Phase B — routing skills, DSR drill-down polygons, default routing workload. */
export class PhaseB1758100000000 implements MigrationInterface {
  name = 'PhaseB1758100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS skill_tags jsonb NOT NULL DEFAULT '[]'::jsonb
    `);

    await queryRunner.query(`
      UPDATE users SET skill_tags = '["high-rise","sunrise"]'::jsonb
      WHERE id = 'usr_agent_01' AND skill_tags = '[]'::jsonb
    `);
    await queryRunner.query(`
      UPDATE users SET skill_tags = '["luxury","riverfront"]'::jsonb
      WHERE id = 'usr_agent_river' AND skill_tags = '[]'::jsonb
    `);

    await queryRunner.query(`
      INSERT INTO crm_routing_rules (tenant_id, project_id, rules, enabled, updated_by)
      VALUES (
        'ten_dev_01', '',
        '{"enabled":true,"hotTierMinScore":85,"strategy":"PARTNER_SCORE_AGING","assignOnTier":"HOT","maxOpenLeads":15,"skillTags":["high-rise"],"requireHumanApproval":true,"roundRobinCursor":0}'::jsonb,
        true, NULL
      )
      ON CONFLICT (tenant_id, project_id) DO UPDATE SET
        rules = crm_routing_rules.rules || '{"maxOpenLeads":15,"skillTags":["high-rise"]}'::jsonb,
        updated_at = now()
    `);

    await queryRunner.query(`
      INSERT INTO dsr_polygons (id, tenant_id, project_id, level, ref_id, label, geojson, sort_order)
      VALUES
        ('dsr_f_a05', 'ten_dev_01', 'prj_sunrise', 'floor', 'tower_a:f05', 'Tầng 5 — Tháp A',
         '{"type":"Polygon","coordinates":[[[106.7212,10.7292],[106.7218,10.7292],[106.7218,10.7298],[106.7212,10.7298],[106.7212,10.7292]]]}', 2),
        ('dsr_f_a10', 'ten_dev_01', 'prj_sunrise', 'floor', 'tower_a:f10', 'Tầng 10 — Tháp A',
         '{"type":"Polygon","coordinates":[[[106.7212,10.7298],[106.7218,10.7298],[106.7218,10.7304],[106.7212,10.7304],[106.7212,10.7298]]]}', 3),
        ('dsr_f_a15', 'ten_dev_01', 'prj_sunrise', 'floor', 'tower_a:f15', 'Tầng 15 — Tháp A',
         '{"type":"Polygon","coordinates":[[[106.7212,10.7304],[106.7218,10.7304],[106.7218,10.7310],[106.7212,10.7310],[106.7212,10.7304]]]}', 4)
      ON CONFLICT (id) DO NOTHING
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    /* data + optional column — no destructive rollback */
  }
}

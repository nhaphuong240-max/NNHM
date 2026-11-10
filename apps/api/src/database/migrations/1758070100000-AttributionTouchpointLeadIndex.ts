import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The lead index lives on the entity. The table is created later by P1Wave,
 * so this index cannot be created in the baseline migration.
 */
export class AttributionTouchpointLeadIndex1758070100000 implements MigrationInterface {
  name = 'AttributionTouchpointLeadIndex1758070100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existing: Array<{ columns: string[] | string }> = await queryRunner.query(`
      SELECT (
        SELECT array_agg(a.attname ORDER BY k.ord)
        FROM unnest(idx.indkey) WITH ORDINALITY AS k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = idx.indrelid AND a.attnum = k.attnum
      ) AS columns
      FROM pg_index idx
      JOIN pg_class t ON t.oid = idx.indrelid
      WHERE t.relname = 'attribution_touchpoints'
        AND idx.indisunique = false
    `);
    const present = existing.some((row) => {
      const columns = Array.isArray(row.columns)
        ? row.columns
        : String(row.columns).replace(/^{|}$/g, '').split(',');
      return columns.join(',') === 'tenant_id,lead_id';
    });
    if (present) return;
    await queryRunner.query(
      `CREATE INDEX "idx_attribution_touchpoints_tenant_id_lead_id" ON "attribution_touchpoints" ("tenant_id", "lead_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const named: Array<{ relname: string }> = await queryRunner.query(`
      SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'i'
        AND c.relname = 'idx_attribution_touchpoints_tenant_id_lead_id'
    `);
    if (named.length === 0) return;
    await queryRunner.query(`DROP INDEX "idx_attribution_touchpoints_tenant_id_lead_id"`);
  }
}

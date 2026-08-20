import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  buildDisableRlsStatements,
  buildEnableRlsStatements,
} from '../rls/tenant-scoped-tables';

/** ADR-002 — Postgres RLS tenant isolation (varchar tenant_id). */
export class EnableTenantRls1738339201000 implements MigrationInterface {
  name = 'EnableTenantRls1738339201000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of buildEnableRlsStatements()) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of buildDisableRlsStatements()) {
      await queryRunner.query(statement);
    }
  }
}

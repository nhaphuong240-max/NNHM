import { MigrationInterface, QueryRunner } from 'typeorm';

/** Spec target tables. Missing pre-existing names are not hidden: CREATE fails if the name is taken. */
export class SpecTargetFoundation1758140000000 implements MigrationInterface {
  name = 'SpecTargetFoundation1758140000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const names = ["org_memberships","scoped_grants","access_review_items","evidence_records","export_jobs","distribution_agreements","unit_allocations","price_book_versions","quotes","customers","dedup_reviews","deposit_agreements","contract_artifacts","handover_checklists","exception_items"];
    const present: Array<{ table_name: string }> = await queryRunner.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [names],
    );
    if (present.length) {
      throw new Error(`spec target refused: these tables already exist: ${present.map((row) => row.table_name).join(', ')}`);
    }
    await queryRunner.query(`
      CREATE TABLE "org_memberships" (
  "id" varchar(32) NOT NULL,
  "tenant_id" varchar(32) NOT NULL,
  "user_id" varchar(128) NOT NULL,
  "org_id" varchar(128) NOT NULL,
  "role_code" varchar(64) NOT NULL,
  "status" varchar(32) NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_org_memberships" PRIMARY KEY ("id")
)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_org_memberships_tenant_id_user_id_org_id_role_code" ON "org_memberships" ("tenant_id", "user_id", "org_id", "role_code")
    `);
    await queryRunner.query(`
      ALTER TABLE "org_memberships" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "org_memberships" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON "org_memberships" USING ((tenant_id = current_setting('app.current_tenant_id', true)) OR (current_setting('app.is_platform_admin', true) = 'true'))
    `);
    await queryRunner.query(`
      CREATE TABLE "scoped_grants" (
  "id" varchar(32) NOT NULL,
  "tenant_id" varchar(32) NOT NULL,
  "grantee_org_id" varchar(128) NOT NULL,
  "project_id" varchar(128) NOT NULL,
  "action" varchar(64) NOT NULL,
  "resource" varchar(64) NOT NULL,
  "expires_at" timestamptz,
  "status" varchar(32) NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_scoped_grants" PRIMARY KEY ("id")
)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_scoped_grants_tenant_id_grantee_org_id_project_id_acti" ON "scoped_grants" ("tenant_id", "grantee_org_id", "project_id", "action", "resource")
    `);
    await queryRunner.query(`
      ALTER TABLE "scoped_grants" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "scoped_grants" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON "scoped_grants" USING ((tenant_id = current_setting('app.current_tenant_id', true)) OR (current_setting('app.is_platform_admin', true) = 'true'))
    `);
    await queryRunner.query(`
      CREATE TABLE "access_review_items" (
  "id" varchar(32) NOT NULL,
  "tenant_id" varchar(32) NOT NULL,
  "user_id" varchar(128) NOT NULL,
  "role_code" varchar(64) NOT NULL,
  "reason" text NOT NULL,
  "status" varchar(32) NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_access_review_items" PRIMARY KEY ("id")
)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_access_review_items_tenant_id_user_id_role_code" ON "access_review_items" ("tenant_id", "user_id", "role_code")
    `);
    await queryRunner.query(`
      ALTER TABLE "access_review_items" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "access_review_items" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON "access_review_items" USING ((tenant_id = current_setting('app.current_tenant_id', true)) OR (current_setting('app.is_platform_admin', true) = 'true'))
    `);
    await queryRunner.query(`
      CREATE TABLE "evidence_records" (
  "id" varchar(32) NOT NULL,
  "tenant_id" varchar(32) NOT NULL,
  "actor_id" varchar(128) NOT NULL,
  "action" varchar(64) NOT NULL,
  "scope" text NOT NULL,
  "reason" text NOT NULL,
  "correlation_id" varchar(128) NOT NULL,
  "status" varchar(32) NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_evidence_records" PRIMARY KEY ("id")
)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_evidence_records_tenant_id_actor_id_action_correlation_id" ON "evidence_records" ("tenant_id", "actor_id", "action", "correlation_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "evidence_records" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "evidence_records" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON "evidence_records" USING ((tenant_id = current_setting('app.current_tenant_id', true)) OR (current_setting('app.is_platform_admin', true) = 'true'))
    `);
    await queryRunner.query(`
      CREATE TABLE "export_jobs" (
  "id" varchar(32) NOT NULL,
  "tenant_id" varchar(32) NOT NULL,
  "purpose" varchar(64) NOT NULL,
  "approved_by" varchar(128),
  "expires_at" timestamptz NOT NULL,
  "status" varchar(32) NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_export_jobs" PRIMARY KEY ("id")
)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_export_jobs_tenant_id_purpose_approved_by" ON "export_jobs" ("tenant_id", "purpose", "approved_by")
    `);
    await queryRunner.query(`
      ALTER TABLE "export_jobs" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "export_jobs" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON "export_jobs" USING ((tenant_id = current_setting('app.current_tenant_id', true)) OR (current_setting('app.is_platform_admin', true) = 'true'))
    `);
    await queryRunner.query(`
      CREATE TABLE "distribution_agreements" (
  "id" varchar(32) NOT NULL,
  "tenant_id" varchar(32) NOT NULL,
  "project_id" varchar(128) NOT NULL,
  "partner_org_id" varchar(128) NOT NULL,
  "stock_owner_tenant_id" varchar(128) NOT NULL,
  "status" varchar(32) NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_distribution_agreements" PRIMARY KEY ("id")
)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_distribution_agreements_tenant_project_partner" ON "distribution_agreements" ("tenant_id", "project_id", "partner_org_id", "stock_owner_tenant_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "distribution_agreements" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "distribution_agreements" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON "distribution_agreements" USING ((tenant_id = current_setting('app.current_tenant_id', true)) OR (current_setting('app.is_platform_admin', true) = 'true'))
    `);
    await queryRunner.query(`
      CREATE TABLE "unit_allocations" (
  "id" varchar(32) NOT NULL,
  "tenant_id" varchar(32) NOT NULL,
  "agreement_id" varchar(128) NOT NULL,
  "unit_id" varchar(128) NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "status" varchar(32) NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_unit_allocations" PRIMARY KEY ("id")
)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_unit_allocations_tenant_id_agreement_id_unit_id" ON "unit_allocations" ("tenant_id", "agreement_id", "unit_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "unit_allocations" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "unit_allocations" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON "unit_allocations" USING ((tenant_id = current_setting('app.current_tenant_id', true)) OR (current_setting('app.is_platform_admin', true) = 'true'))
    `);
    await queryRunner.query(`
      CREATE TABLE "price_book_versions" (
  "id" varchar(32) NOT NULL,
  "tenant_id" varchar(32) NOT NULL,
  "project_id" varchar(128) NOT NULL,
  "version_no" integer NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "status" varchar(32) NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_price_book_versions" PRIMARY KEY ("id")
)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_price_book_versions_tenant_id_project_id_version_no" ON "price_book_versions" ("tenant_id", "project_id", "version_no")
    `);
    await queryRunner.query(`
      ALTER TABLE "price_book_versions" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "price_book_versions" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON "price_book_versions" USING ((tenant_id = current_setting('app.current_tenant_id', true)) OR (current_setting('app.is_platform_admin', true) = 'true'))
    `);
    await queryRunner.query(`
      CREATE TABLE "quotes" (
  "id" varchar(32) NOT NULL,
  "tenant_id" varchar(32) NOT NULL,
  "price_book_id" varchar(128) NOT NULL,
  "unit_id" varchar(128) NOT NULL,
  "quote_hash" varchar(128) NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "status" varchar(32) NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_quotes" PRIMARY KEY ("id")
)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_quotes_tenant_id_price_book_id_unit_id_quote_ha" ON "quotes" ("tenant_id", "price_book_id", "unit_id", "quote_hash")
    `);
    await queryRunner.query(`
      ALTER TABLE "quotes" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "quotes" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON "quotes" USING ((tenant_id = current_setting('app.current_tenant_id', true)) OR (current_setting('app.is_platform_admin', true) = 'true'))
    `);
    await queryRunner.query(`
      CREATE TABLE "customers" (
  "id" varchar(32) NOT NULL,
  "tenant_id" varchar(32) NOT NULL,
  "phone_hash" varchar(128) NOT NULL,
  "display_name" varchar(128) NOT NULL,
  "status" varchar(32) NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_customers" PRIMARY KEY ("id")
)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_customers_tenant_id_phone_hash_display_name" ON "customers" ("tenant_id", "phone_hash", "display_name")
    `);
    await queryRunner.query(`
      ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "customers" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON "customers" USING ((tenant_id = current_setting('app.current_tenant_id', true)) OR (current_setting('app.is_platform_admin', true) = 'true'))
    `);
    await queryRunner.query(`
      CREATE TABLE "dedup_reviews" (
  "id" varchar(32) NOT NULL,
  "tenant_id" varchar(32) NOT NULL,
  "customer_id" varchar(128) NOT NULL,
  "lead_id" varchar(128) NOT NULL,
  "status" varchar(32) NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_dedup_reviews" PRIMARY KEY ("id")
)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_dedup_reviews_tenant_id_customer_id_lead_id" ON "dedup_reviews" ("tenant_id", "customer_id", "lead_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "dedup_reviews" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "dedup_reviews" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON "dedup_reviews" USING ((tenant_id = current_setting('app.current_tenant_id', true)) OR (current_setting('app.is_platform_admin', true) = 'true'))
    `);
    await queryRunner.query(`
      CREATE TABLE "deposit_agreements" (
  "id" varchar(32) NOT NULL,
  "tenant_id" varchar(32) NOT NULL,
  "booking_id" varchar(128) NOT NULL,
  "amount" bigint NOT NULL,
  "status" varchar(32) NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_deposit_agreements" PRIMARY KEY ("id")
)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_deposit_agreements_tenant_id_booking_id_amount" ON "deposit_agreements" ("tenant_id", "booking_id", "amount")
    `);
    await queryRunner.query(`
      ALTER TABLE "deposit_agreements" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "deposit_agreements" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON "deposit_agreements" USING ((tenant_id = current_setting('app.current_tenant_id', true)) OR (current_setting('app.is_platform_admin', true) = 'true'))
    `);
    await queryRunner.query(`
      CREATE TABLE "contract_artifacts" (
  "id" varchar(32) NOT NULL,
  "tenant_id" varchar(32) NOT NULL,
  "booking_id" varchar(128) NOT NULL,
  "template_version" varchar(64) NOT NULL,
  "status" varchar(32) NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_contract_artifacts" PRIMARY KEY ("id")
)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_contract_artifacts_tenant_id_booking_id_template_version" ON "contract_artifacts" ("tenant_id", "booking_id", "template_version")
    `);
    await queryRunner.query(`
      ALTER TABLE "contract_artifacts" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "contract_artifacts" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON "contract_artifacts" USING ((tenant_id = current_setting('app.current_tenant_id', true)) OR (current_setting('app.is_platform_admin', true) = 'true'))
    `);
    await queryRunner.query(`
      CREATE TABLE "handover_checklists" (
  "id" varchar(32) NOT NULL,
  "tenant_id" varchar(32) NOT NULL,
  "booking_id" varchar(128) NOT NULL,
  "status" varchar(32) NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_handover_checklists" PRIMARY KEY ("id")
)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_handover_checklists_tenant_id_booking_id" ON "handover_checklists" ("tenant_id", "booking_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "handover_checklists" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "handover_checklists" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON "handover_checklists" USING ((tenant_id = current_setting('app.current_tenant_id', true)) OR (current_setting('app.is_platform_admin', true) = 'true'))
    `);
    await queryRunner.query(`
      CREATE TABLE "exception_items" (
  "id" varchar(32) NOT NULL,
  "tenant_id" varchar(32) NOT NULL,
  "owner_id" varchar(128) NOT NULL,
  "severity" varchar(64) NOT NULL,
  "due_at" timestamptz NOT NULL,
  "status" varchar(32) NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_exception_items" PRIMARY KEY ("id")
)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_exception_items_tenant_id_owner_id_severity" ON "exception_items" ("tenant_id", "owner_id", "severity")
    `);
    await queryRunner.query(`
      ALTER TABLE "exception_items" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "exception_items" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON "exception_items" USING ((tenant_id = current_setting('app.current_tenant_id', true)) OR (current_setting('app.is_platform_admin', true) = 'true'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP POLICY tenant_isolation ON "exception_items"');
    await queryRunner.query('ALTER TABLE "exception_items" NO FORCE ROW LEVEL SECURITY');
    await queryRunner.query('ALTER TABLE "exception_items" DISABLE ROW LEVEL SECURITY');
    await queryRunner.query('DROP TABLE "exception_items"');
    await queryRunner.query('DROP POLICY tenant_isolation ON "handover_checklists"');
    await queryRunner.query('ALTER TABLE "handover_checklists" NO FORCE ROW LEVEL SECURITY');
    await queryRunner.query('ALTER TABLE "handover_checklists" DISABLE ROW LEVEL SECURITY');
    await queryRunner.query('DROP TABLE "handover_checklists"');
    await queryRunner.query('DROP POLICY tenant_isolation ON "contract_artifacts"');
    await queryRunner.query('ALTER TABLE "contract_artifacts" NO FORCE ROW LEVEL SECURITY');
    await queryRunner.query('ALTER TABLE "contract_artifacts" DISABLE ROW LEVEL SECURITY');
    await queryRunner.query('DROP TABLE "contract_artifacts"');
    await queryRunner.query('DROP POLICY tenant_isolation ON "deposit_agreements"');
    await queryRunner.query('ALTER TABLE "deposit_agreements" NO FORCE ROW LEVEL SECURITY');
    await queryRunner.query('ALTER TABLE "deposit_agreements" DISABLE ROW LEVEL SECURITY');
    await queryRunner.query('DROP TABLE "deposit_agreements"');
    await queryRunner.query('DROP POLICY tenant_isolation ON "dedup_reviews"');
    await queryRunner.query('ALTER TABLE "dedup_reviews" NO FORCE ROW LEVEL SECURITY');
    await queryRunner.query('ALTER TABLE "dedup_reviews" DISABLE ROW LEVEL SECURITY');
    await queryRunner.query('DROP TABLE "dedup_reviews"');
    await queryRunner.query('DROP POLICY tenant_isolation ON "customers"');
    await queryRunner.query('ALTER TABLE "customers" NO FORCE ROW LEVEL SECURITY');
    await queryRunner.query('ALTER TABLE "customers" DISABLE ROW LEVEL SECURITY');
    await queryRunner.query('DROP TABLE "customers"');
    await queryRunner.query('DROP POLICY tenant_isolation ON "quotes"');
    await queryRunner.query('ALTER TABLE "quotes" NO FORCE ROW LEVEL SECURITY');
    await queryRunner.query('ALTER TABLE "quotes" DISABLE ROW LEVEL SECURITY');
    await queryRunner.query('DROP TABLE "quotes"');
    await queryRunner.query('DROP POLICY tenant_isolation ON "price_book_versions"');
    await queryRunner.query('ALTER TABLE "price_book_versions" NO FORCE ROW LEVEL SECURITY');
    await queryRunner.query('ALTER TABLE "price_book_versions" DISABLE ROW LEVEL SECURITY');
    await queryRunner.query('DROP TABLE "price_book_versions"');
    await queryRunner.query('DROP POLICY tenant_isolation ON "unit_allocations"');
    await queryRunner.query('ALTER TABLE "unit_allocations" NO FORCE ROW LEVEL SECURITY');
    await queryRunner.query('ALTER TABLE "unit_allocations" DISABLE ROW LEVEL SECURITY');
    await queryRunner.query('DROP TABLE "unit_allocations"');
    await queryRunner.query('DROP POLICY tenant_isolation ON "distribution_agreements"');
    await queryRunner.query('ALTER TABLE "distribution_agreements" NO FORCE ROW LEVEL SECURITY');
    await queryRunner.query('ALTER TABLE "distribution_agreements" DISABLE ROW LEVEL SECURITY');
    await queryRunner.query('DROP TABLE "distribution_agreements"');
    await queryRunner.query('DROP POLICY tenant_isolation ON "export_jobs"');
    await queryRunner.query('ALTER TABLE "export_jobs" NO FORCE ROW LEVEL SECURITY');
    await queryRunner.query('ALTER TABLE "export_jobs" DISABLE ROW LEVEL SECURITY');
    await queryRunner.query('DROP TABLE "export_jobs"');
    await queryRunner.query('DROP POLICY tenant_isolation ON "evidence_records"');
    await queryRunner.query('ALTER TABLE "evidence_records" NO FORCE ROW LEVEL SECURITY');
    await queryRunner.query('ALTER TABLE "evidence_records" DISABLE ROW LEVEL SECURITY');
    await queryRunner.query('DROP TABLE "evidence_records"');
    await queryRunner.query('DROP POLICY tenant_isolation ON "access_review_items"');
    await queryRunner.query('ALTER TABLE "access_review_items" NO FORCE ROW LEVEL SECURITY');
    await queryRunner.query('ALTER TABLE "access_review_items" DISABLE ROW LEVEL SECURITY');
    await queryRunner.query('DROP TABLE "access_review_items"');
    await queryRunner.query('DROP POLICY tenant_isolation ON "scoped_grants"');
    await queryRunner.query('ALTER TABLE "scoped_grants" NO FORCE ROW LEVEL SECURITY');
    await queryRunner.query('ALTER TABLE "scoped_grants" DISABLE ROW LEVEL SECURITY');
    await queryRunner.query('DROP TABLE "scoped_grants"');
    await queryRunner.query('DROP POLICY tenant_isolation ON "org_memberships"');
    await queryRunner.query('ALTER TABLE "org_memberships" NO FORCE ROW LEVEL SECURITY');
    await queryRunner.query('ALTER TABLE "org_memberships" DISABLE ROW LEVEL SECURITY');
    await queryRunner.query('DROP TABLE "org_memberships"');
  }
}

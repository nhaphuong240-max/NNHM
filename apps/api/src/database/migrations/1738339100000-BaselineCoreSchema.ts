import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the core tables that the later migrations never CREATE.
 * Refuses to continue when any of those tables already exist.
 * Does not create geo/cms/token uniques or the four later DESC indexes.
 */
export class BaselineCoreSchema1738339100000 implements MigrationInterface {
  name = 'BaselineCoreSchema1738339100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$
DECLARE
  existing text;
BEGIN
  SELECT string_agg(table_name, ', ' ORDER BY table_name)
    INTO existing
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name IN ('tenants', 'agency_applications', 'projects', 'units', 'users', 'audit_events', 'listings', 'listing_media', 'bookings', 'booking_domain_events', 'leads', 'crm_activities', 'search_outbox', 'search_index_docs', 'lead_scoring_outbox', 'ledger_entries', 'ledger_journals', 'payment_intents', 'payment_webhook_events', 'reconciliation_reports', 'commission_policies', 'commission_snapshots', 'commission_entries', 'commission_disputes', 'commission_settlement_runs', 'kyc_profiles', 'meta_lead_events', 'meta_page_bindings', 'zalo_lead_events', 'zalo_oa_bindings', 'zalo_zns_deliveries', 'sms_bindings', 'sms_deliveries', 'distribution_policies', 'documents', 'document_access_logs', 'refunds', 'trust_disputes', 'tenant_config_versions', 'consent_ledger_entries', 'lead_conversion_events', 'developer_trust_scores', 'bnpl_applications', 'bnpl_installments', 'anchor_tenant_profiles', 'agent_activity_events', 'agent_wau_daily', 'mobile_devices', 'api_partners', 'api_partner_keys', 'api_webhook_deliveries', 'escrow_accounts', 'escrow_milestones', 'escrow_release_events', 'data_mart_daily', 'data_product_entitlements');
  IF existing IS NOT NULL THEN
    RAISE EXCEPTION 'baseline refused: these tables already exist: %', existing;
  END IF;
END $$;`);

    await queryRunner.query(`CREATE TABLE "tenants" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "name" varchar(255) NOT NULL,
  "type" varchar(32) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE TABLE "agency_applications" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "developer_tenant_id" varchar(32) NOT NULL,
  "agency_tenant_id" varchar(32) NOT NULL,
  "project_id" varchar(32) NOT NULL,
  "distribution_policy_id" varchar(32) NOT NULL,
  "status" varchar(16) NOT NULL DEFAULT 'PENDING',
  "message" text NULL,
  "review_notes" text NULL,
  "reviewed_by" varchar(32) NULL,
  "reviewed_at" timestamptz NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_agency_applications_f334093f" ON "agency_applications" ("agency_tenant_id", "project_id", "distribution_policy_id")`);

    await queryRunner.query(`CREATE TABLE "projects" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "code" varchar(32) NOT NULL,
  "name" varchar(255) NOT NULL,
  "city" varchar(64) NULL,
  "district" varchar(64) NULL,
  "latitude" numeric(10,7) NULL,
  "longitude" numeric(10,7) NULL,
  "demand_policy_override" jsonb NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE TABLE "units" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "project_id" varchar(32) NOT NULL,
  "code" varchar(64) NOT NULL,
  "floor" integer NULL,
  "area" numeric(8,2) NOT NULL,
  "bedrooms" integer NOT NULL,
  "base_price" bigint NOT NULL,
  "status" varchar(16) NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE TABLE "users" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "email" varchar(255) NOT NULL CONSTRAINT "uq_users_email" UNIQUE,
  "password_hash" varchar(255) NOT NULL,
  "role" varchar(64) NOT NULL,
  "organization_id" varchar(32) NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "partner_score" integer NOT NULL DEFAULT 50,
  "skill_tags" jsonb NOT NULL DEFAULT '[]',
  "mfa_secret" varchar(64) NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE TABLE "audit_events" (
  "id" BIGSERIAL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "entity_type" varchar(64) NOT NULL,
  "entity_id" varchar(64) NOT NULL,
  "action" varchar(32) NOT NULL,
  "payload" jsonb NULL,
  "actor_id" varchar(32) NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE TABLE "listings" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "unit_id" varchar(32) NOT NULL,
  "unit_version" integer NOT NULL DEFAULT 1,
  "title" varchar(255) NOT NULL,
  "description" text NOT NULL,
  "highlights" jsonb NOT NULL DEFAULT '[]',
  "media_ids" jsonb NOT NULL DEFAULT '[]',
  "price_display" bigint NULL,
  "status" varchar(24) NOT NULL,
  "anti_drift_status" varchar(8) NOT NULL,
  "drift_report" jsonb NULL,
  "verified" boolean NOT NULL DEFAULT false,
  "verification_level" varchar(2) NOT NULL DEFAULT 'V0',
  "transaction_type" varchar(16) NOT NULL DEFAULT 'sale',
  "freshness_paused_at" timestamptz NULL,
  "reject_reason" text NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE TABLE "listing_media" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "listing_id" varchar(32) NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "mime_type" varchar(128) NOT NULL,
  "storage_key" varchar(512) NOT NULL,
  "size_bytes" bigint NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_cover" boolean NOT NULL DEFAULT false,
  "scan_status" varchar(16) NOT NULL DEFAULT 'PENDING',
  "created_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE TABLE "bookings" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "unit_id" varchar(32) NOT NULL,
  "unit_version" integer NOT NULL DEFAULT 1,
  "lead_id" varchar(32) NULL,
  "status" varchar(16) NOT NULL,
  "lock_id" varchar(64) NOT NULL,
  "lock_token" varchar(64) NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "deposit_amount" bigint NULL,
  "notes" text NULL,
  "idempotency_key" varchar(128) NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_bookings_tenant_id_idempotency_key" ON "bookings" ("tenant_id", "idempotency_key")`);

    await queryRunner.query(`CREATE TABLE "booking_domain_events" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "booking_id" varchar(32) NOT NULL,
  "event_type" varchar(64) NOT NULL,
  "category" varchar(16) NOT NULL,
  "payload" jsonb NULL,
  "actor_id" varchar(32) NULL,
  "correlation_id" varchar(64) NULL,
  "occurred_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE INDEX "idx_booking_domain_events_tenant_id_booking_id_occurred_at" ON "booking_domain_events" ("tenant_id", "booking_id", "occurred_at")`);

    await queryRunner.query(`CREATE TABLE "leads" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "full_name" varchar(128) NOT NULL,
  "phone" varchar(32) NOT NULL,
  "email" varchar(128) NULL,
  "source" varchar(32) NOT NULL,
  "score" integer NOT NULL DEFAULT 0,
  "tier" varchar(8) NOT NULL,
  "status" varchar(16) NOT NULL DEFAULT 'NEW',
  "routing_status" varchar(16) NOT NULL DEFAULT 'PENDING',
  "score_status" varchar(16) NOT NULL DEFAULT 'PENDING',
  "assigned_to" varchar(32) NULL,
  "scoring_meta" jsonb NULL,
  "channel_meta" jsonb NULL,
  "unit_id" varchar(32) NULL,
  "listing_id" varchar(32) NULL,
  "project_id" varchar(32) NULL,
  "inquiry_type" varchar(16) NULL,
  "requirement" jsonb NULL,
  "message" text NULL,
  "idempotency_key" varchar(128) NULL,
  "consent_given" boolean NOT NULL DEFAULT false,
  "consent_at" timestamptz NULL,
  "privacy_policy_version" varchar(32) NULL,
  "marketing_consent" boolean NOT NULL DEFAULT false,
  "utm_campaign" varchar(128) NULL,
  "campaign_id" varchar(128) NULL,
  "lost_reason" varchar(64) NULL,
  "last_activity_at" timestamptz NULL,
  "first_touch_at" timestamptz NULL,
  "hot_sla_due_at" timestamptz NULL,
  "hot_sla_breached" boolean NOT NULL DEFAULT false,
  "health_score" integer NULL,
  "health_meta" jsonb NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_leads_tenant_id_idempotency_key" ON "leads" ("tenant_id", "idempotency_key")`);

    await queryRunner.query(`CREATE INDEX "idx_leads_tenant_id_utm_campaign" ON "leads" ("tenant_id", "utm_campaign")`);

    await queryRunner.query(`CREATE INDEX "idx_leads_tenant_id_campaign_id" ON "leads" ("tenant_id", "campaign_id")`);

    await queryRunner.query(`CREATE TABLE "crm_activities" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "lead_id" varchar(32) NOT NULL,
  "type" varchar(16) NOT NULL,
  "summary" varchar(255) NULL,
  "metadata" jsonb NULL,
  "created_by" varchar(32) NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE INDEX "idx_crm_activities_tenant_id_lead_id" ON "crm_activities" ("tenant_id", "lead_id")`);

    await queryRunner.query(`CREATE TABLE "search_outbox" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "entity_type" varchar(16) NOT NULL,
  "entity_id" varchar(32) NOT NULL,
  "operation" varchar(16) NOT NULL,
  "payload" jsonb NULL,
  "status" varchar(16) NOT NULL DEFAULT 'PENDING',
  "attempts" integer NOT NULL DEFAULT 0,
  "last_error" text NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "processed_at" timestamptz NULL
)`);

    await queryRunner.query(`CREATE INDEX "idx_search_outbox_status_created_at" ON "search_outbox" ("status", "created_at")`);

    await queryRunner.query(`CREATE TABLE "search_index_docs" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "listing_id" varchar(32) NOT NULL,
  "project_name" varchar(128) NOT NULL,
  "title" varchar(255) NOT NULL,
  "code" varchar(32) NOT NULL,
  "base_price" numeric(18,0) NOT NULL,
  "bedrooms" integer NOT NULL,
  "area" numeric(10,2) NOT NULL,
  "verified" boolean NOT NULL DEFAULT false,
  "verification_level" varchar(2) NOT NULL DEFAULT 'V0',
  "city" varchar(64) NULL,
  "district" varchar(64) NULL,
  "transaction_type" varchar(16) NOT NULL DEFAULT 'sale',
  "latitude" numeric(10,7) NULL,
  "longitude" numeric(10,7) NULL,
  "thumbnail_url" varchar(512) NULL,
  "search_text" text NOT NULL,
  "detail" jsonb NOT NULL,
  "indexed_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE INDEX "idx_search_index_docs_tenant_id" ON "search_index_docs" ("tenant_id")`);

    await queryRunner.query(`CREATE INDEX "idx_search_index_docs_tenant_id_bedrooms" ON "search_index_docs" ("tenant_id", "bedrooms")`);

    await queryRunner.query(`CREATE INDEX "idx_search_index_docs_tenant_id_transaction_type" ON "search_index_docs" ("tenant_id", "transaction_type")`);

    await queryRunner.query(`CREATE TABLE "lead_scoring_outbox" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "lead_id" varchar(32) NOT NULL,
  "payload" jsonb NOT NULL,
  "status" varchar(16) NOT NULL DEFAULT 'PENDING',
  "attempts" integer NOT NULL DEFAULT 0,
  "last_error" text NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "processed_at" timestamptz NULL
)`);

    await queryRunner.query(`CREATE INDEX "idx_lead_scoring_outbox_status_created_at" ON "lead_scoring_outbox" ("status", "created_at")`);

    await queryRunner.query(`CREATE TABLE "ledger_entries" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "journal_id" varchar(32) NOT NULL,
  "tenant_id" varchar(32) NOT NULL,
  "account" varchar(32) NOT NULL,
  "side" varchar(8) NOT NULL,
  "amount" bigint NOT NULL,
  "currency" varchar(8) NOT NULL DEFAULT 'VND',
  "reference_type" varchar(32) NOT NULL,
  "reference_id" varchar(32) NOT NULL,
  "posted_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE INDEX "idx_ledger_entries_journal_id" ON "ledger_entries" ("journal_id")`);

    await queryRunner.query(`CREATE TABLE "ledger_journals" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "webhook_event_id" varchar(128) NOT NULL,
  "booking_id" varchar(32) NOT NULL,
  "payment_intent_id" varchar(32) NOT NULL,
  "reference" varchar(128) NOT NULL,
  "posted_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_ledger_journals_webhook_event_id" ON "ledger_journals" ("webhook_event_id")`);

    await queryRunner.query(`CREATE TABLE "payment_intents" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "booking_id" varchar(32) NOT NULL,
  "amount" bigint NOT NULL,
  "currency" varchar(8) NOT NULL DEFAULT 'VND',
  "method" varchar(16) NOT NULL,
  "status" varchar(16) NOT NULL,
  "payment_url" text NOT NULL,
  "gateway_ref" varchar(128) NULL,
  "idempotency_key" varchar(128) NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_payment_intents_tenant_id_idempotency_key" ON "payment_intents" ("tenant_id", "idempotency_key")`);

    await queryRunner.query(`CREATE TABLE "payment_webhook_events" (
  "id" BIGSERIAL PRIMARY KEY,
  "event_id" varchar(128) NOT NULL,
  "tenant_id" varchar(32) NOT NULL,
  "event_type" varchar(32) NOT NULL,
  "transaction_id" varchar(128) NOT NULL,
  "payment_intent_id" varchar(32) NOT NULL,
  "status" varchar(16) NOT NULL,
  "payload" jsonb NULL,
  "result" jsonb NULL,
  "ledger_entry_id" varchar(32) NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_payment_webhook_events_event_id" ON "payment_webhook_events" ("event_id")`);

    await queryRunner.query(`CREATE TABLE "reconciliation_reports" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "report_date" date NOT NULL,
  "status" varchar(16) NOT NULL,
  "gateway_total" bigint NOT NULL,
  "ledger_total" bigint NOT NULL,
  "gateway_count" integer NOT NULL DEFAULT 0,
  "ledger_count" integer NOT NULL DEFAULT 0,
  "discrepancies" jsonb NOT NULL DEFAULT '[]',
  "ran_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_reconciliation_reports_tenant_id_report_date" ON "reconciliation_reports" ("tenant_id", "report_date")`);

    await queryRunner.query(`CREATE TABLE "commission_policies" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "project_id" varchar(32) NOT NULL,
  "version" integer NOT NULL,
  "status" varchar(16) NOT NULL,
  "name" varchar(128) NOT NULL,
  "rate_percent" numeric(6,3) NOT NULL,
  "base_type" varchar(16) NOT NULL DEFAULT 'DEPOSIT',
  "split_rules" jsonb NOT NULL,
  "effective_from" date NULL,
  "effective_to" date NULL,
  "published_at" timestamptz NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_commission_policies_tenant_id_project_id_version" ON "commission_policies" ("tenant_id", "project_id", "version")`);

    await queryRunner.query(`CREATE TABLE "commission_snapshots" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "booking_id" varchar(32) NOT NULL,
  "policy_id" varchar(32) NOT NULL,
  "policy_version" integer NOT NULL,
  "policy_hash" varchar(64) NOT NULL,
  "deal_amount" bigint NOT NULL,
  "total_commission" bigint NOT NULL,
  "status" varchar(16) NOT NULL,
  "calculated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_commission_snapshots_tenant_id_booking_id" ON "commission_snapshots" ("tenant_id", "booking_id")`);

    await queryRunner.query(`CREATE TABLE "commission_entries" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "snapshot_id" varchar(32) NOT NULL,
  "recipient_type" varchar(16) NOT NULL,
  "recipient_id" varchar(32) NOT NULL,
  "role" varchar(16) NOT NULL,
  "split_percent" numeric(6,3) NOT NULL,
  "amount" bigint NOT NULL,
  "payout_status" varchar(16) NOT NULL DEFAULT 'PENDING',
  "settlement_run_id" varchar(32) NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE INDEX "idx_commission_entries_snapshot_id" ON "commission_entries" ("snapshot_id")`);

    await queryRunner.query(`CREATE INDEX "idx_commission_entries_settlement_run_id" ON "commission_entries" ("settlement_run_id")`);

    await queryRunner.query(`CREATE TABLE "commission_disputes" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "snapshot_id" varchar(32) NOT NULL,
  "reason" text NOT NULL,
  "status" varchar(16) NOT NULL,
  "holdback_percent" numeric(6,3) NOT NULL DEFAULT 100,
  "opened_at" timestamptz NOT NULL DEFAULT now(),
  "resolved_at" timestamptz NULL
)`);

    await queryRunner.query(`CREATE INDEX "idx_commission_disputes_snapshot_id" ON "commission_disputes" ("snapshot_id")`);

    await queryRunner.query(`CREATE TABLE "commission_settlement_runs" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "status" varchar(16) NOT NULL DEFAULT 'PENDING',
  "label" varchar(128) NULL,
  "period_from" date NULL,
  "period_to" date NULL,
  "entry_count" integer NOT NULL DEFAULT 0,
  "total_amount" bigint NOT NULL DEFAULT '0',
  "created_by" varchar(32) NULL,
  "completed_at" timestamptz NULL,
  "last_error" text NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE INDEX "idx_commission_settlement_runs_tenant_id_status" ON "commission_settlement_runs" ("tenant_id", "status")`);

    await queryRunner.query(`CREATE TABLE "kyc_profiles" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "subject_type" varchar(16) NOT NULL,
  "subject_id" varchar(32) NOT NULL,
  "status" varchar(16) NOT NULL DEFAULT 'PENDING',
  "verified_at" timestamptz NULL,
  "notes" text NULL,
  "external_ref" varchar(128) NULL,
  "provider" varchar(32) NULL,
  "verification_level" varchar(32) NULL,
  "document_type" varchar(32) NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_kyc_profiles_tenant_id_subject_type_subject_id" ON "kyc_profiles" ("tenant_id", "subject_type", "subject_id")`);

    await queryRunner.query(`CREATE TABLE "meta_lead_events" (
  "leadgen_id" varchar(64) NOT NULL,
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "page_id" varchar(64) NOT NULL,
  "status" varchar(16) NOT NULL DEFAULT 'PROCESSING',
  "lead_id" varchar(32) NULL,
  "payload" jsonb NOT NULL,
  "last_error" text NULL,
  "processed_at" timestamptz NULL,
  "ingest_ms" integer NULL,
  "sla_ms" integer NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_meta_lead_events_leadgen_id" ON "meta_lead_events" ("leadgen_id")`);

    await queryRunner.query(`CREATE TABLE "meta_page_bindings" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "page_id" varchar(64) NOT NULL,
  "page_name" varchar(128) NOT NULL,
  "page_access_token" text NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_meta_page_bindings_page_id" ON "meta_page_bindings" ("page_id")`);

    await queryRunner.query(`CREATE TABLE "zalo_lead_events" (
  "msg_id" varchar(64) NOT NULL,
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "oa_id" varchar(64) NOT NULL,
  "status" varchar(16) NOT NULL DEFAULT 'PROCESSING',
  "lead_id" varchar(32) NULL,
  "payload" jsonb NOT NULL,
  "last_error" text NULL,
  "processed_at" timestamptz NULL,
  "ingest_ms" integer NULL,
  "sla_ms" integer NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_zalo_lead_events_msg_id" ON "zalo_lead_events" ("msg_id")`);

    await queryRunner.query(`CREATE TABLE "zalo_oa_bindings" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "oa_id" varchar(64) NOT NULL,
  "oa_name" varchar(128) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "access_token" varchar(512) NULL,
  "refresh_token" varchar(512) NULL,
  "token_expires_at" timestamptz NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_zalo_oa_bindings_oa_id" ON "zalo_oa_bindings" ("oa_id")`);

    await queryRunner.query(`CREATE TABLE "zalo_zns_deliveries" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "template_id" varchar(64) NOT NULL,
  "phone" varchar(20) NOT NULL,
  "status" varchar(16) NOT NULL DEFAULT 'QUEUED',
  "params" jsonb NOT NULL DEFAULT '{}',
  "provider_ref" varchar(64) NULL,
  "last_error" text NULL,
  "source_type" varchar(32) NULL,
  "source_id" varchar(64) NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_zalo_zns_deliveries_tenant_id_source_type_source_id" ON "zalo_zns_deliveries" ("tenant_id", "source_type", "source_id") WHERE "source_id" IS NOT NULL`);

    await queryRunner.query(`CREATE TABLE "sms_bindings" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "provider" varchar(32) NOT NULL DEFAULT 'SANDBOX',
  "brand_name" varchar(64) NOT NULL,
  "sender_id" varchar(32) NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "api_key" varchar(128) NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE TABLE "sms_deliveries" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "template_id" varchar(64) NOT NULL,
  "phone" varchar(20) NOT NULL,
  "status" varchar(16) NOT NULL DEFAULT 'QUEUED',
  "params" jsonb NOT NULL DEFAULT '{}',
  "provider_ref" varchar(64) NULL,
  "last_error" text NULL,
  "source_type" varchar(32) NULL,
  "source_id" varchar(64) NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_sms_deliveries_tenant_id_source_type_source_id" ON "sms_deliveries" ("tenant_id", "source_type", "source_id") WHERE "source_id" IS NOT NULL`);

    await queryRunner.query(`CREATE TABLE "distribution_policies" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "project_id" varchar(32) NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "status" varchar(16) NOT NULL,
  "name" varchar(128) NOT NULL,
  "terms" jsonb NOT NULL DEFAULT '{}',
  "published_at" timestamptz NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_distribution_policies_tenant_id_project_id_version" ON "distribution_policies" ("tenant_id", "project_id", "version")`);

    await queryRunner.query(`CREATE TABLE "documents" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "entity_type" varchar(16) NOT NULL,
  "entity_id" varchar(32) NOT NULL,
  "folder" varchar(16) NOT NULL DEFAULT 'LEGAL',
  "doc_type" varchar(64) NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "mime_type" varchar(128) NOT NULL,
  "size_bytes" integer NOT NULL,
  "content_hash" varchar(64) NOT NULL,
  "storage_key" varchar(512) NOT NULL,
  "storage_provider" varchar(16) NOT NULL DEFAULT 'LOCAL',
  "watermark_enabled" boolean NOT NULL DEFAULT true,
  "scan_status" varchar(16) NOT NULL DEFAULT 'CLEAN',
  "retention_class" varchar(32) NOT NULL DEFAULT '5Y',
  "version" integer NOT NULL DEFAULT 1,
  "created_by" varchar(32) NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE INDEX "idx_documents_tenant_id_entity_type_entity_id" ON "documents" ("tenant_id", "entity_type", "entity_id")`);

    await queryRunner.query(`CREATE TABLE "document_access_logs" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "document_id" varchar(32) NOT NULL,
  "action" varchar(16) NOT NULL,
  "actor_id" varchar(32) NULL,
  "metadata" jsonb NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE INDEX "idx_document_access_logs_tenant_id_document_id_created_at" ON "document_access_logs" ("tenant_id", "document_id", "created_at")`);

    await queryRunner.query(`CREATE TABLE "refunds" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "booking_id" varchar(32) NOT NULL,
  "payment_intent_id" varchar(32) NOT NULL,
  "amount" bigint NOT NULL,
  "currency" varchar(8) NOT NULL DEFAULT 'VND',
  "status" varchar(16) NOT NULL,
  "gateway_ref" varchar(128) NULL,
  "reason" text NULL,
  "idempotency_key" varchar(128) NULL,
  "ledger_entry_id" varchar(32) NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_refunds_tenant_id_idempotency_key" ON "refunds" ("tenant_id", "idempotency_key")`);

    await queryRunner.query(`CREATE TABLE "trust_disputes" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "booking_id" varchar(32) NULL,
  "type" varchar(24) NOT NULL,
  "status" varchar(24) NOT NULL,
  "reason" text NOT NULL,
  "evidence" jsonb NOT NULL DEFAULT '[]',
  "resolution_note" text NULL,
  "opened_by" varchar(32) NULL,
  "resolved_at" timestamptz NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE TABLE "tenant_config_versions" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "domain" varchar(32) NOT NULL,
  "entity_id" varchar(64) NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "payload" jsonb NOT NULL,
  "effective_at" timestamptz NOT NULL,
  "created_by" varchar(32) NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_tenant_config_versions_tenant_id_domain_entity_id_version" ON "tenant_config_versions" ("tenant_id", "domain", "entity_id", "version")`);

    await queryRunner.query(`CREATE TABLE "consent_ledger_entries" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "subject_type" varchar(16) NOT NULL,
  "subject_id" varchar(64) NOT NULL,
  "purpose" varchar(24) NOT NULL,
  "policy_version" varchar(32) NOT NULL,
  "granted" boolean NOT NULL,
  "channel" varchar(32) NULL,
  "ip_hash" varchar(64) NULL,
  "actor_id" varchar(32) NULL,
  "recorded_at" timestamptz NOT NULL
)`);

    await queryRunner.query(`CREATE INDEX "idx_consent_ledger_entries_tenant_id_subject_type_subject_id" ON "consent_ledger_entries" ("tenant_id", "subject_type", "subject_id")`);

    await queryRunner.query(`CREATE INDEX "idx_consent_ledger_entries_tenant_id_recorded_at" ON "consent_ledger_entries" ("tenant_id", "recorded_at")`);

    await queryRunner.query(`CREATE TABLE "lead_conversion_events" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "lead_id" varchar(32) NOT NULL,
  "event_type" varchar(16) NOT NULL,
  "payload" jsonb NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE INDEX "idx_lead_conversion_events_tenant_id_lead_id" ON "lead_conversion_events" ("tenant_id", "lead_id")`);

    await queryRunner.query(`CREATE INDEX "idx_lead_conversion_events_tenant_id_event_type" ON "lead_conversion_events" ("tenant_id", "event_type")`);

    await queryRunner.query(`CREATE TABLE "developer_trust_scores" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "project_id" varchar(32) NOT NULL,
  "score" integer NOT NULL,
  "factors" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_developer_trust_scores_tenant_id_project_id" ON "developer_trust_scores" ("tenant_id", "project_id")`);

    await queryRunner.query(`CREATE TABLE "bnpl_applications" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "booking_id" varchar(32) NOT NULL,
  "plan_label" varchar(64) NOT NULL,
  "total_amount" numeric(14,2) NOT NULL,
  "installment_count" integer NOT NULL,
  "status" varchar(16) NOT NULL,
  "external_id" varchar(128) NULL,
  "partner_reason" varchar(256) NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE INDEX "idx_bnpl_applications_tenant_id_booking_id" ON "bnpl_applications" ("tenant_id", "booking_id")`);

    await queryRunner.query(`CREATE TABLE "bnpl_installments" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "application_id" varchar(32) NOT NULL,
  "due_date" date NOT NULL,
  "amount" numeric(14,2) NOT NULL,
  "status" varchar(16) NOT NULL DEFAULT 'PENDING',
  "paid_at" timestamptz NULL
)`);

    await queryRunner.query(`CREATE INDEX "idx_bnpl_installments_tenant_id_application_id" ON "bnpl_installments" ("tenant_id", "application_id")`);

    await queryRunner.query(`CREATE TABLE "anchor_tenant_profiles" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "tier" varchar(16) NOT NULL DEFAULT 'ANCHOR',
  "project_ids" jsonb NOT NULL DEFAULT '[]',
  "sla_pack_version" varchar(32) NOT NULL DEFAULT '2026-T5-v1',
  "trust_score_min" integer NOT NULL DEFAULT 80,
  "display_name" varchar(128) NOT NULL,
  "legal_name" varchar(256) NULL,
  "pilot_class" varchar(16) NOT NULL DEFAULT 'SYNTHETIC',
  "onboarding_status" varchar(16) NOT NULL DEFAULT 'ACTIVE',
  "onboarded_at" timestamptz NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_anchor_tenant_profiles_tenant_id" ON "anchor_tenant_profiles" ("tenant_id")`);

    await queryRunner.query(`CREATE TABLE "agent_activity_events" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "user_id" varchar(32) NOT NULL,
  "source" varchar(16) NOT NULL,
  "event_type" varchar(32) NOT NULL,
  "session_id" varchar(64) NULL,
  "payload" jsonb NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE INDEX "idx_agent_activity_events_tenant_id_user_id_created_at" ON "agent_activity_events" ("tenant_id", "user_id", "created_at")`);

    await queryRunner.query(`CREATE TABLE "agent_wau_daily" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "report_date" date NOT NULL,
  "wau" integer NOT NULL DEFAULT 0,
  "dau" integer NOT NULL DEFAULT 0,
  "mobile_share" numeric(5,4) NOT NULL DEFAULT '0',
  "unique_agents" jsonb NOT NULL DEFAULT '[]'
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_agent_wau_daily_tenant_id_report_date" ON "agent_wau_daily" ("tenant_id", "report_date")`);

    await queryRunner.query(`CREATE TABLE "mobile_devices" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "user_id" varchar(32) NOT NULL,
  "push_token" varchar(256) NOT NULL,
  "platform" varchar(16) NOT NULL DEFAULT 'unknown',
  "device_name" varchar(128) NULL,
  "app_channel" varchar(16) NOT NULL DEFAULT 'AGENT',
  "registered_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE INDEX "idx_mobile_devices_tenant_id_user_id" ON "mobile_devices" ("tenant_id", "user_id")`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_mobile_devices_tenant_id_push_token" ON "mobile_devices" ("tenant_id", "push_token")`);

    await queryRunner.query(`CREATE TABLE "api_partners" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "name" varchar(128) NOT NULL,
  "category" varchar(16) NOT NULL,
  "status" varchar(16) NOT NULL DEFAULT 'REGISTER',
  "webhook_url" varchar(512) NULL,
  "rate_limit_per_min" integer NOT NULL DEFAULT 60,
  "events_consumed" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE INDEX "idx_api_partners_tenant_id_name" ON "api_partners" ("tenant_id", "name")`);

    await queryRunner.query(`CREATE TABLE "api_partner_keys" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "partner_id" varchar(32) NOT NULL,
  "key_hash" varchar(64) NOT NULL,
  "key_prefix" varchar(32) NOT NULL,
  "revoked_at" timestamptz NULL
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_api_partner_keys_tenant_id_key_hash" ON "api_partner_keys" ("tenant_id", "key_hash")`);

    await queryRunner.query(`CREATE TABLE "api_webhook_deliveries" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "partner_id" varchar(32) NOT NULL,
  "event" varchar(64) NOT NULL,
  "status" varchar(16) NOT NULL,
  "response_code" integer NULL,
  "payload" jsonb NULL,
  "delivered_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE INDEX "idx_api_webhook_deliveries_tenant_id_partner_id" ON "api_webhook_deliveries" ("tenant_id", "partner_id")`);

    await queryRunner.query(`CREATE TABLE "escrow_accounts" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "booking_id" varchar(32) NOT NULL,
  "total_amount" numeric(14,2) NOT NULL,
  "held_amount" numeric(14,2) NOT NULL,
  "released_amount" numeric(14,2) NOT NULL DEFAULT '0',
  "status" varchar(16) NOT NULL DEFAULT 'ACTIVE',
  "regulatory_scope" varchar(32) NOT NULL DEFAULT 'ESCROW_NHNN',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE INDEX "idx_escrow_accounts_tenant_id_booking_id" ON "escrow_accounts" ("tenant_id", "booking_id")`);

    await queryRunner.query(`CREATE TABLE "escrow_milestones" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "account_id" varchar(32) NOT NULL,
  "label" varchar(64) NOT NULL,
  "amount" numeric(14,2) NOT NULL,
  "condition" varchar(128) NOT NULL,
  "status" varchar(16) NOT NULL DEFAULT 'PENDING',
  "released_at" timestamptz NULL
)`);

    await queryRunner.query(`CREATE INDEX "idx_escrow_milestones_tenant_id_account_id" ON "escrow_milestones" ("tenant_id", "account_id")`);

    await queryRunner.query(`CREATE TABLE "escrow_release_events" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "account_id" varchar(32) NOT NULL,
  "milestone_id" varchar(32) NOT NULL,
  "amount" numeric(14,2) NOT NULL,
  "approved_by_finance" boolean NOT NULL DEFAULT false,
  "approved_by_compliance" boolean NOT NULL DEFAULT false,
  "bank_webhook_confirmed" boolean NOT NULL DEFAULT false,
  "ledger_journal_id" varchar(32) NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE INDEX "idx_escrow_release_events_tenant_id_account_id" ON "escrow_release_events" ("tenant_id", "account_id")`);

    await queryRunner.query(`CREATE TABLE "data_mart_daily" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "project_id" varchar(32) NULL,
  "report_date" date NOT NULL,
  "absorption_rate" numeric(6,4) NOT NULL DEFAULT '0',
  "avg_price_band" varchar(32) NULL,
  "velocity_units" integer NOT NULL DEFAULT 0,
  "heatmap" jsonb NOT NULL DEFAULT '{}'
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_data_mart_daily_tenant_id_report_date_project_id" ON "data_mart_daily" ("tenant_id", "report_date", "project_id")`);

    await queryRunner.query(`CREATE TABLE "data_product_entitlements" (
  "id" varchar(32) NOT NULL PRIMARY KEY,
  "tenant_id" varchar(32) NOT NULL,
  "product_code" varchar(32) NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "quota_per_month" integer NOT NULL DEFAULT 100,
  "created_at" timestamptz NOT NULL DEFAULT now()
)`);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_data_product_entitlements_tenant_id_product_code" ON "data_product_entitlements" ("tenant_id", "product_code")`);

    await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "fk_projects_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT`);

    await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "fk_users_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT`);

    await queryRunner.query(`ALTER TABLE "units" ADD CONSTRAINT "fk_units_project_id" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE RESTRICT`);

    await queryRunner.query(`ALTER TABLE "listings" ADD CONSTRAINT "fk_listings_unit_id" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT`);

    await queryRunner.query(`ALTER TABLE "listing_media" ADD CONSTRAINT "fk_listing_media_listing_id" FOREIGN KEY ("listing_id") REFERENCES "listings" ("id") ON DELETE CASCADE`);

    await queryRunner.query(`ALTER TABLE "api_partner_keys" ADD CONSTRAINT "fk_api_partner_keys_partner_id" FOREIGN KEY ("partner_id") REFERENCES "api_partners" ("id") ON DELETE CASCADE`);

    await queryRunner.query(`ALTER TABLE "bnpl_installments" ADD CONSTRAINT "fk_bnpl_installments_application_id" FOREIGN KEY ("application_id") REFERENCES "bnpl_applications" ("id") ON DELETE RESTRICT`);

    await queryRunner.query(`ALTER TABLE "escrow_milestones" ADD CONSTRAINT "fk_escrow_milestones_account_id" FOREIGN KEY ("account_id") REFERENCES "escrow_accounts" ("id") ON DELETE RESTRICT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "listing_media"`);
    await queryRunner.query(`DROP TABLE "listings"`);
    await queryRunner.query(`DROP TABLE "units"`);
    await queryRunner.query(`DROP TABLE "api_partner_keys"`);
    await queryRunner.query(`DROP TABLE "bnpl_installments"`);
    await queryRunner.query(`DROP TABLE "escrow_milestones"`);
    await queryRunner.query(`DROP TABLE "agency_applications"`);
    await queryRunner.query(`DROP TABLE "audit_events"`);
    await queryRunner.query(`DROP TABLE "bookings"`);
    await queryRunner.query(`DROP TABLE "booking_domain_events"`);
    await queryRunner.query(`DROP TABLE "leads"`);
    await queryRunner.query(`DROP TABLE "crm_activities"`);
    await queryRunner.query(`DROP TABLE "search_outbox"`);
    await queryRunner.query(`DROP TABLE "search_index_docs"`);
    await queryRunner.query(`DROP TABLE "lead_scoring_outbox"`);
    await queryRunner.query(`DROP TABLE "ledger_entries"`);
    await queryRunner.query(`DROP TABLE "ledger_journals"`);
    await queryRunner.query(`DROP TABLE "payment_intents"`);
    await queryRunner.query(`DROP TABLE "payment_webhook_events"`);
    await queryRunner.query(`DROP TABLE "reconciliation_reports"`);
    await queryRunner.query(`DROP TABLE "commission_policies"`);
    await queryRunner.query(`DROP TABLE "commission_snapshots"`);
    await queryRunner.query(`DROP TABLE "commission_entries"`);
    await queryRunner.query(`DROP TABLE "commission_disputes"`);
    await queryRunner.query(`DROP TABLE "commission_settlement_runs"`);
    await queryRunner.query(`DROP TABLE "kyc_profiles"`);
    await queryRunner.query(`DROP TABLE "meta_lead_events"`);
    await queryRunner.query(`DROP TABLE "meta_page_bindings"`);
    await queryRunner.query(`DROP TABLE "zalo_lead_events"`);
    await queryRunner.query(`DROP TABLE "zalo_oa_bindings"`);
    await queryRunner.query(`DROP TABLE "zalo_zns_deliveries"`);
    await queryRunner.query(`DROP TABLE "sms_bindings"`);
    await queryRunner.query(`DROP TABLE "sms_deliveries"`);
    await queryRunner.query(`DROP TABLE "distribution_policies"`);
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP TABLE "document_access_logs"`);
    await queryRunner.query(`DROP TABLE "refunds"`);
    await queryRunner.query(`DROP TABLE "trust_disputes"`);
    await queryRunner.query(`DROP TABLE "tenant_config_versions"`);
    await queryRunner.query(`DROP TABLE "consent_ledger_entries"`);
    await queryRunner.query(`DROP TABLE "lead_conversion_events"`);
    await queryRunner.query(`DROP TABLE "developer_trust_scores"`);
    await queryRunner.query(`DROP TABLE "anchor_tenant_profiles"`);
    await queryRunner.query(`DROP TABLE "agent_activity_events"`);
    await queryRunner.query(`DROP TABLE "agent_wau_daily"`);
    await queryRunner.query(`DROP TABLE "mobile_devices"`);
    await queryRunner.query(`DROP TABLE "api_webhook_deliveries"`);
    await queryRunner.query(`DROP TABLE "escrow_release_events"`);
    await queryRunner.query(`DROP TABLE "data_mart_daily"`);
    await queryRunner.query(`DROP TABLE "data_product_entitlements"`);
    await queryRunner.query(`DROP TABLE "projects"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "api_partners"`);
    await queryRunner.query(`DROP TABLE "bnpl_applications"`);
    await queryRunner.query(`DROP TABLE "escrow_accounts"`);
    await queryRunner.query(`DROP TABLE "tenants"`);
  }
}

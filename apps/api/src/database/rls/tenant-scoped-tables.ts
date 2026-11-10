/** Tables with standard `tenant_id` column — ADR-002 RLS coverage. */
export const TENANT_ID_TABLES = [
  'projects',
  'units',
  'users',
  'audit_events',
  'listings',
  'listing_media',
  'bookings',
  'booking_domain_events',
  'leads',
  'crm_activities',
  'search_outbox',
  'search_index_docs',
  'lead_scoring_outbox',
  'ledger_entries',
  'ledger_journals',
  'payment_intents',
  'payment_webhook_events',
  'reconciliation_reports',
  'commission_policies',
  'commission_snapshots',
  'commission_entries',
  'commission_disputes',
  'commission_settlement_runs',
  'kyc_profiles',
  'meta_lead_events',
  'meta_page_bindings',
  'zalo_lead_events',
  'zalo_oa_bindings',
  'zalo_zns_deliveries',
  'sms_bindings',
  'sms_deliveries',
  'distribution_policies',
  'documents',
  'document_access_logs',
  'refunds',
  'trust_disputes',
  'tenant_config_versions',
  'consent_ledger_entries',
  'lead_conversion_events',
  'developer_trust_scores',
  'bnpl_applications',
  'bnpl_installments',
  'anchor_tenant_profiles',
  'agent_activity_events',
  'agent_wau_daily',
  'mobile_devices',
  'api_partners',
  'api_partner_keys',
  'api_webhook_deliveries',
  'escrow_accounts',
  'escrow_milestones',
  'escrow_release_events',
  'data_mart_daily',
  'data_product_entitlements',
] as const;

export type TenantIdTable = (typeof TENANT_ID_TABLES)[number];

/**
 * Tables created after 1738339201000. The older migration must keep enabling
 * only TENANT_ID_TABLES, because these relations do not exist at that timestamp.
 */
export const REMAINING_TENANT_ID_TABLES = [
  'ai_lead_copilot_drafts',
  'analytics_events',
  'attribution_touchpoints',
  'cms_homepage_config',
  'cms_pages',
  'crm_notify_deliveries',
  'crm_routing_rules',
  'crm_routing_suggestions',
  'crm_viewings',
  'deal_disputes',
  'dsr_polygons',
  'dsr_share_links',
  'geo_areas',
  'lead_registrations',
  'open_day_events',
  'open_day_rsvps',
  'saved_searches',
  'seeker_otp_challenges',
  'sla_breach_logs',
  'tenant_demand_policies',
  'walk_in_checkins',
  'walk_in_galleries',
] as const;

/** Tables introduced by the spec-target migration. Compared for RLS with the two lists above. */
export const SPEC_TENANT_TABLES = [
  'org_memberships',
  'scoped_grants',
  'access_review_items',
  'evidence_records',
  'export_jobs',
  'distribution_agreements',
  'unit_allocations',
  'price_book_versions',
  'quotes',
  'customers',
  'dedup_reviews',
  'deposit_agreements',
  'contract_artifacts',
  'handover_checklists',
  'exception_items',
] as const;

const TENANT_ISOLATION_EXPR =
  "tenant_id = current_setting('app.current_tenant_id', true)";

const PLATFORM_ADMIN_EXPR =
  "current_setting('app.is_platform_admin', true) = 'true'";

export function tenantIsolationUsingTenantColumn(): string {
  return `((${TENANT_ISOLATION_EXPR}) OR (${PLATFORM_ADMIN_EXPR}))`;
}

export function buildRemainingRlsStatements(tables: readonly string[]): string[] {
  const statements: string[] = [];
  for (const table of tables) {
    statements.push(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
    statements.push(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`);
    statements.push(
      `CREATE POLICY tenant_isolation ON "${table}" USING (${tenantIsolationUsingTenantColumn()})`,
    );
  }
  return statements;
}

export function buildRemainingRlsRollback(tables: readonly string[]): string[] {
  const statements: string[] = [];
  for (const table of tables) {
    statements.push(`DROP POLICY tenant_isolation ON "${table}"`);
    statements.push(`ALTER TABLE "${table}" NO FORCE ROW LEVEL SECURITY`);
    statements.push(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`);
  }
  return statements;
}

export function tenantIsolationPolicy(table: string, usingExpr: string): string {
  return `CREATE POLICY tenant_isolation ON ${table} USING ((${usingExpr}) OR (${PLATFORM_ADMIN_EXPR}))`;
}

export function buildEnableRlsStatements(): string[] {
  const statements: string[] = [];

  for (const table of TENANT_ID_TABLES) {
    statements.push(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    statements.push(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    statements.push(`DROP POLICY IF EXISTS tenant_isolation ON ${table}`);
    statements.push(tenantIsolationPolicy(table, TENANT_ISOLATION_EXPR));
  }

  statements.push('ALTER TABLE tenants ENABLE ROW LEVEL SECURITY');
  statements.push('ALTER TABLE tenants FORCE ROW LEVEL SECURITY');
  statements.push('DROP POLICY IF EXISTS tenant_isolation ON tenants');
  statements.push(
    tenantIsolationPolicy(
      'tenants',
      "id = current_setting('app.current_tenant_id', true)",
    ),
  );

  statements.push('ALTER TABLE agency_applications ENABLE ROW LEVEL SECURITY');
  statements.push('ALTER TABLE agency_applications FORCE ROW LEVEL SECURITY');
  statements.push('DROP POLICY IF EXISTS tenant_isolation ON agency_applications');
  statements.push(
    tenantIsolationPolicy(
      'agency_applications',
      "developer_tenant_id = current_setting('app.current_tenant_id', true) OR agency_tenant_id = current_setting('app.current_tenant_id', true)",
    ),
  );

  return statements;
}

export function buildDisableRlsStatements(): string[] {
  const statements: string[] = [];
  const allTables = [...TENANT_ID_TABLES, 'tenants', 'agency_applications'] as const;

  for (const table of allTables) {
    statements.push(`DROP POLICY IF EXISTS tenant_isolation ON ${table}`);
    statements.push(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
  }

  return statements;
}

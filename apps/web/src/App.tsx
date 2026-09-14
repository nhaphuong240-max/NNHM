import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './components/RequireAuth';
import { SearchPage } from './pages/SearchPage';
import { PublicHomePage } from './pages/public/PublicHomePage';
import { OpsPortalsPage } from './pages/app/OpsPortalsPage';
import { PublicUnitDetailPage } from './pages/public/PublicUnitDetailPage';
import { PublicComparePage } from './pages/public/PublicComparePage';
import { PublicRecommendationsPage } from './pages/public/PublicRecommendationsPage';
import { FinanceLoginPage } from './pages/finance/FinanceLoginPage';
import { ReconciliationDashboardPage } from './pages/finance/ReconciliationDashboardPage';
import { RefundsPage } from './pages/finance/RefundsPage';
import { FinanceSettlementPage } from './pages/finance/FinanceSettlementPage';
import { FinanceCommissionExportPage } from './pages/finance/FinanceCommissionExportPage';
import { FinanceCommissionSplitPage } from './pages/finance/FinanceCommissionSplitPage';
import { DeveloperAbsorptionPage } from './pages/developer/DeveloperAbsorptionPage';
import { DeveloperAttributionPage } from './pages/developer/DeveloperAttributionPage';
import { DeveloperCommissionPage } from './pages/developer/DeveloperCommissionPage';
import { DeveloperDistributionPage } from './pages/developer/DeveloperDistributionPage';
import { DeveloperDocumentsPage } from './pages/developer/DeveloperDocumentsPage';
import { DeveloperHomePage } from './pages/developer/DeveloperHomePage';
import { DeveloperProductGraphPage } from './pages/developer/DeveloperProductGraphPage';
import { DeveloperForecastPage } from './pages/developer/DeveloperForecastPage';
import { DeveloperIntelligencePage } from './pages/developer/DeveloperIntelligencePage';
import { DeveloperAnchorPage } from './pages/developer/DeveloperAnchorPage';
import { DeveloperTimeTravelPage } from './pages/developer/DeveloperTimeTravelPage';
import { DeveloperUnitImportPage } from './pages/developer/DeveloperUnitImportPage';
import { DeveloperUnitsPage } from './pages/developer/DeveloperUnitsPage';
import { DeveloperLeaderboardPage } from './pages/developer/DeveloperLeaderboardPage';
import { DeveloperWebhooksPage } from './pages/developer/DeveloperWebhooksPage';
import { AuthLoginPage } from './pages/auth/AuthLoginPage';
import { AgentBookingTimelinePage } from './pages/agent/AgentBookingTimelinePage';
import { AgentBookingCancelPage } from './pages/agent/AgentBookingCancelPage';
import { AgentContractCreatePage } from './pages/agent/AgentContractCreatePage';
import { AgentSlaTasksPage } from './pages/agent/AgentSlaTasksPage';
import { AgentHomePage } from './pages/agent/AgentHomePage';
import { AgentKpiPage } from './pages/agent/AgentKpiPage';
import { AgentLeadsPage } from './pages/agent/AgentLeadsPage';
import { AgentBookingCreatePage } from './pages/agent/AgentBookingCreatePage';
import { AgentLeadsImportPage } from './pages/agent/AgentLeadsImportPage';
import { AgentListingMediaPage } from './pages/agent/AgentListingMediaPage';
import { AgentLeadDetailPage } from './pages/agent/AgentLeadDetailPage';
import { AgentListingWizardPage } from './pages/agent/AgentListingWizardPage';
import { AgentMarketplaceApplyPage } from './pages/agent/AgentMarketplaceApplyPage';
import { AgentPipelinePage } from './pages/agent/AgentPipelinePage';
import { AgentRoutingSettingsPage } from './pages/agent/AgentRoutingSettingsPage';
import { AgentAiLegalPage } from './pages/agent/AgentAiLegalPage';
import { AgentAiReplyPage } from './pages/agent/AgentAiReplyPage';
import { AgentInboxPage } from './pages/agent/AgentInboxPage';
import { AgentViewingsPage } from './pages/agent/AgentViewingsPage';
import { AgentRegistrationsPage } from './pages/agent/AgentRegistrationsPage';
import { PublicChatPage } from './pages/public/PublicChatPage';
import { PublicMapPage } from './pages/public/PublicMapPage';
import { PublicDsrPage } from './pages/public/PublicDsrPage';
import { PublicOpenDayPage } from './pages/public/PublicOpenDayPage';
import { PublicSharePage } from './pages/public/PublicSharePage';
import { PublicProjectPage } from './pages/public/PublicProjectPage';
import { PublicDistrictPage } from './pages/public/PublicDistrictPage';
import { PublicEmiPage } from './pages/public/PublicEmiPage';
import { PublicSavedSearchesPage } from './pages/public/PublicSavedSearchesPage';
import { LegalPrivacyPage } from './pages/public/LegalPrivacyPage';
import { AuthSsoPage } from './pages/auth/AuthSsoPage';
import { AuthSsoCallbackPage } from './pages/auth/AuthSsoCallbackPage';
import { AdminWhitelabelPage } from './pages/admin/AdminWhitelabelPage';
import { AdminWorkflowsPage } from './pages/admin/AdminWorkflowsPage';
import { FinanceEscrowPage } from './pages/finance/FinanceEscrowPage';
import { BuyerBnplPage } from './pages/buyer/BuyerBnplPage';
import { AdminMetaIntegrationPage } from './pages/admin/AdminMetaIntegrationPage';
import { AdminSmsIntegrationPage } from './pages/admin/AdminSmsIntegrationPage';
import { AdminZaloIntegrationPage } from './pages/admin/AdminZaloIntegrationPage';
import { AdminModerationPage } from './pages/admin/AdminModerationPage';
import { AdminOmnichannelPage } from './pages/admin/AdminOmnichannelPage';
import { AdminAuditExplorerPage } from './pages/admin/AdminAuditExplorerPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminOpsPage } from './pages/admin/AdminOpsPage';
import { AdminGmvPage } from './pages/admin/AdminGmvPage';
import { AdminAttributionPage } from './pages/admin/AdminAttributionPage';
import { AdminHoldbackPage } from './pages/admin/AdminHoldbackPage';
import { AdminBookingReplayPage } from './pages/admin/AdminBookingReplayPage';
import { AdminDisputesPage } from './pages/admin/AdminDisputesPage';
import { AdminDuplicatesPage } from './pages/admin/AdminDuplicatesPage';
import { AdminKycPage } from './pages/admin/AdminKycPage';
import { AdminTenantOnboardPage } from './pages/admin/AdminTenantOnboardPage';
import { AdminUserRolesPage } from './pages/admin/AdminUserRolesPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { BuyerDealDetailPage } from './pages/buyer/BuyerDealDetailPage';
import { BuyerDealsPage } from './pages/buyer/BuyerDealsPage';
import { BuyerPaymentPage } from './pages/buyer/BuyerPaymentPage';
import { BuyerPaymentResultPage } from './pages/buyer/BuyerPaymentResultPage';
import { BuyerEsignPage } from './pages/buyer/BuyerEsignPage';
import { AdminAiAnomalyPage } from './pages/admin/AdminAiAnomalyPage';
import { AdminApiMarketplacePage } from './pages/admin/AdminApiMarketplacePage';
import { AdminMarketplacePage } from './pages/admin/AdminMarketplacePage';
import { AdminPaymentGatewaysPage } from './pages/admin/AdminPaymentGatewaysPage';
import { AdminRegulatoryExportPage } from './pages/admin/AdminRegulatoryExportPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicHomePage />} />
      <Route path="/app" element={<OpsPortalsPage />} />
      <Route path="/mua/:districtSlug" element={<PublicDistrictPage />} />
      <Route path="/public/tools/emi" element={<PublicEmiPage />} />
      <Route path="/public/saved" element={<PublicSavedSearchesPage />} />
      <Route path="/legal/privacy" element={<LegalPrivacyPage />} />
      <Route path="/public/search" element={<SearchPage />} />
      <Route path="/public/recommendations" element={<PublicRecommendationsPage />} />
      <Route path="/public/chat" element={<PublicChatPage />} />
      <Route path="/public/map" element={<PublicMapPage />} />
      <Route path="/public/dsr/:projectId" element={<PublicDsrPage />} />
      <Route path="/public/open-day" element={<PublicOpenDayPage />} />
      <Route path="/public/share/:token" element={<PublicSharePage />} />
      <Route path="/public/projects/:projectId" element={<PublicProjectPage />} />
      <Route path="/public/compare" element={<PublicComparePage />} />
      <Route path="/public/units/:unitId" element={<PublicUnitDetailPage />} />
      <Route path="/finance/login" element={<FinanceLoginPage />} />
      <Route path="/auth/login" element={<AuthLoginPage />} />
      <Route path="/auth/sso" element={<AuthSsoPage />} />
      <Route path="/auth/sso/callback" element={<AuthSsoCallbackPage />} />
      <Route path="/finance" element={<Navigate to="/finance/reconciliation" replace />} />
      <Route
        path="/finance/escrow"
        element={
          <RequireAuth>
            <FinanceEscrowPage />
          </RequireAuth>
        }
      />
      <Route
        path="/finance/settlement"
        element={
          <RequireAuth>
            <FinanceSettlementPage />
          </RequireAuth>
        }
      />
      <Route
        path="/finance/reconciliation"
        element={
          <RequireAuth>
            <ReconciliationDashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/finance/refunds"
        element={
          <RequireAuth>
            <RefundsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/finance/commission/export"
        element={
          <RequireAuth>
            <FinanceCommissionExportPage />
          </RequireAuth>
        }
      />
      <Route
        path="/finance/commission/split"
        element={
          <RequireAuth>
            <FinanceCommissionSplitPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminDashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/ops"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminOpsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/developer"
        element={
          <RequireAuth loginPath="/auth/login">
            <DeveloperHomePage />
          </RequireAuth>
        }
      />
      <Route
        path="/developer/product-graph"
        element={
          <RequireAuth loginPath="/auth/login">
            <DeveloperProductGraphPage />
          </RequireAuth>
        }
      />
      <Route
        path="/developer/time-travel"
        element={
          <RequireAuth loginPath="/auth/login">
            <DeveloperTimeTravelPage />
          </RequireAuth>
        }
      />
      <Route
        path="/developer/forecast"
        element={
          <RequireAuth loginPath="/auth/login">
            <DeveloperForecastPage />
          </RequireAuth>
        }
      />
      <Route
        path="/developer/anchor"
        element={
          <RequireAuth loginPath="/auth/login">
            <DeveloperAnchorPage />
          </RequireAuth>
        }
      />
      <Route
        path="/developer/intelligence"
        element={
          <RequireAuth loginPath="/auth/login">
            <DeveloperIntelligencePage />
          </RequireAuth>
        }
      />
      <Route path="/developer/import" element={<Navigate to="/developer/units/import" replace />} />
      <Route
        path="/developer/units/import"
        element={
          <RequireAuth loginPath="/auth/login">
            <DeveloperUnitImportPage />
          </RequireAuth>
        }
      />
      <Route
        path="/developer/units"
        element={
          <RequireAuth loginPath="/auth/login">
            <DeveloperUnitsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/developer/absorption"
        element={
          <RequireAuth loginPath="/auth/login">
            <DeveloperAbsorptionPage />
          </RequireAuth>
        }
      />
      <Route
        path="/developer/attribution"
        element={
          <RequireAuth loginPath="/auth/login">
            <DeveloperAttributionPage />
          </RequireAuth>
        }
      />
      <Route
        path="/developer/commission"
        element={
          <RequireAuth loginPath="/auth/login">
            <DeveloperCommissionPage />
          </RequireAuth>
        }
      />
      <Route
        path="/developer/distribution"
        element={
          <RequireAuth loginPath="/auth/login">
            <DeveloperDistributionPage />
          </RequireAuth>
        }
      />
      <Route
        path="/developer/documents"
        element={
          <RequireAuth loginPath="/auth/login">
            <DeveloperDocumentsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/developer/leaderboard"
        element={
          <RequireAuth loginPath="/auth/login">
            <DeveloperLeaderboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/developer/webhooks"
        element={
          <RequireAuth loginPath="/auth/login">
            <DeveloperWebhooksPage />
          </RequireAuth>
        }
      />
      <Route
        path="/agent"
        element={
          <RequireAuth loginPath="/auth/login">
            <AgentHomePage />
          </RequireAuth>
        }
      />
      <Route
        path="/agent/kpi"
        element={
          <RequireAuth loginPath="/auth/login">
            <AgentKpiPage />
          </RequireAuth>
        }
      />
      <Route
        path="/agent/pipeline"
        element={
          <RequireAuth loginPath="/auth/login">
            <AgentPipelinePage />
          </RequireAuth>
        }
      />
      <Route
        path="/agent/leads/import"
        element={
          <RequireAuth loginPath="/auth/login">
            <AgentLeadsImportPage />
          </RequireAuth>
        }
      />
      <Route
        path="/agent/leads"
        element={
          <RequireAuth loginPath="/auth/login">
            <AgentLeadsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/agent/viewings"
        element={
          <RequireAuth loginPath="/auth/login">
            <AgentViewingsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/agent/registrations"
        element={
          <RequireAuth loginPath="/auth/login">
            <AgentRegistrationsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/agent/tasks/sla"
        element={
          <RequireAuth loginPath="/auth/login">
            <AgentSlaTasksPage />
          </RequireAuth>
        }
      />
      <Route
        path="/agent/contracts/new"
        element={
          <RequireAuth loginPath="/auth/login">
            <AgentContractCreatePage />
          </RequireAuth>
        }
      />
      <Route
        path="/agent/leads/:leadId"
        element={
          <RequireAuth loginPath="/auth/login">
            <AgentLeadDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/agent/settings/routing"
        element={
          <RequireAuth loginPath="/auth/login">
            <AgentRoutingSettingsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/agent/ai/reply"
        element={
          <RequireAuth loginPath="/auth/login">
            <AgentAiReplyPage />
          </RequireAuth>
        }
      />
      <Route
        path="/agent/inbox"
        element={
          <RequireAuth loginPath="/auth/login">
            <AgentInboxPage />
          </RequireAuth>
        }
      />
      <Route
        path="/agent/ai/legal"
        element={
          <RequireAuth loginPath="/auth/login">
            <AgentAiLegalPage />
          </RequireAuth>
        }
      />
      <Route
        path="/agent/listings/new"
        element={
          <RequireAuth loginPath="/auth/login">
            <AgentListingWizardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/agent/listings/media"
        element={
          <RequireAuth loginPath="/auth/login">
            <AgentListingMediaPage />
          </RequireAuth>
        }
      />
      <Route
        path="/agent/marketplace/apply"
        element={
          <RequireAuth loginPath="/auth/login">
            <AgentMarketplaceApplyPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/analytics/gmv"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminGmvPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/analytics/attribution"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminAttributionPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/commission/holdback"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminHoldbackPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/tenants/onboard"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminTenantOnboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/users/roles"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminUserRolesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/bookings/replay"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminBookingReplayPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/disputes"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminDisputesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/duplicates"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminDuplicatesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/users"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminUsersPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/kyc"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminKycPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/integrations/leads"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminOmnichannelPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/integrations/zalo"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminZaloIntegrationPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/integrations/sms"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminSmsIntegrationPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/integrations/meta"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminMetaIntegrationPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/audit"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminAuditExplorerPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/moderation"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminModerationPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/ai/anomaly"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminAiAnomalyPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/api-marketplace"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminApiMarketplacePage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/marketplace"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminMarketplacePage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/payment-gateways"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminPaymentGatewaysPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/regulatory-export"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminRegulatoryExportPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/whitelabel"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminWhitelabelPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/workflows"
        element={
          <RequireAuth loginPath="/auth/login">
            <AdminWorkflowsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/agent/bookings/new"
        element={
          <RequireAuth loginPath="/auth/login">
            <AgentBookingCreatePage />
          </RequireAuth>
        }
      />
      <Route path="/buyer/deals" element={<BuyerDealsPage />} />
      <Route path="/buyer/bnpl" element={<BuyerBnplPage />} />
      <Route path="/buyer/deals/:bookingId" element={<BuyerDealDetailPage />} />
      <Route path="/buyer/esign" element={<BuyerEsignPage />} />
      <Route path="/buyer/payment/result" element={<BuyerPaymentResultPage />} />
      <Route path="/buyer/payment/:intentId" element={<BuyerPaymentPage />} />
      <Route path="/agent/bookings/demo" element={<Navigate to="/agent/bookings/sample" replace />} />
      <Route
        path="/agent/bookings/cancel"
        element={
          <RequireAuth loginPath="/auth/login">
            <AgentBookingCancelPage />
          </RequireAuth>
        }
      />
      <Route
        path="/agent/bookings/:bookingId"
        element={
          <RequireAuth loginPath="/auth/login">
            <AgentBookingTimelinePage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

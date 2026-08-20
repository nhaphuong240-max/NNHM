import { Routes, Route, Navigate } from 'react-router-dom';
import { USE_CASES } from './config/useCases';
import PortalHub from './pages/PortalHub';
import UseCaseCatalog from './pages/catalog/UseCaseCatalog';
import UCScreenPage from './pages/uc/UCScreenPage';
import DeveloperDashboard from './pages/developer/DeveloperDashboard';
import LoginPage from './pages/auth/LoginPage';
import DesignSystemPage from './pages/design/DesignSystemPage';
import AgentMobilePage from './pages/agent/AgentMobilePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PortalHub />} />
      <Route path="/catalog" element={<UseCaseCatalog />} />
      <Route path="/design-system" element={<DesignSystemPage />} />

      {/* Universal UC routes — 58 use cases */}
      <Route path="/uc/:ucId" element={<UCScreenPage />} />

      {/* Auth */}
      <Route path="/auth/login" element={<LoginPage />} />

      {/* Legacy portal shortcuts → primary UC */}
      <Route path="/public" element={<Navigate to="/uc/UC-LS-01" replace />} />
      <Route path="/public/search" element={<Navigate to="/uc/UC-LS-01" replace />} />
      <Route path="/public/units/:id" element={<Navigate to="/uc/UC-LS-05" replace />} />
      <Route path="/public/compare" element={<Navigate to="/uc/UC-LS-03" replace />} />
      <Route path="/agent" element={<Navigate to="/uc/UC-AN-01" replace />} />
      <Route path="/agent/leads" element={<Navigate to="/uc/UC-CRM-03" replace />} />
      <Route path="/agent/leads/:id" element={<Navigate to="/uc/UC-AI-02" replace />} />
      <Route path="/agent/pipeline" element={<Navigate to="/uc/UC-CRM-03" replace />} />
      <Route path="/agent/listings/new" element={<Navigate to="/uc/UC-AI-01" replace />} />
      <Route path="/agent/bookings/new" element={<Navigate to="/uc/UC-BK-01" replace />} />
      <Route path="/agent/mobile" element={<AgentMobilePage />} />
      <Route path="/admin" element={<Navigate to="/uc/UC-UX-03" replace />} />
      <Route path="/admin/tenants" element={<Navigate to="/uc/UC-ID-01" replace />} />
      <Route path="/admin/moderation" element={<Navigate to="/uc/UC-LS-02" replace />} />
      <Route path="/admin/audit" element={<Navigate to="/uc/UC-TR-01" replace />} />
      {/* Portal Chủ đầu tư (Developer) — FR-UX-04 */}
      <Route path="/developer" element={<DeveloperDashboard />} />
      <Route path="/finance" element={<Navigate to="/uc/UC-PAY-02" replace />} />
      <Route path="/buyer" element={<Navigate to="/uc/UC-UX-02" replace />} />

      {/* Direct routes from use case registry (deduped) */}
      {USE_CASES.filter((uc, i, arr) =>
        arr.findIndex((x) => x.route === uc.route) === i &&
        !uc.route.startsWith('/uc/') &&
        uc.route !== '/developer' &&
        uc.route !== '/agent/mobile'
      ).map((uc) => (
        <Route key={uc.route} path={uc.route} element={<Navigate to={`/uc/${uc.id}`} replace />} />
      ))}

      <Route path="*" element={<Navigate to="/catalog" replace />} />
    </Routes>
  );
}

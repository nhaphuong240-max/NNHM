import { Navigate, useParams, Link } from 'react-router-dom';
import { getUseCase } from '../../config/useCases';
import { PremiumShell, PageHero, ContentArea } from '../../components/premium/PremiumShell';
import { ScreenTemplate } from '../../components/premium/ScreenTemplates';
import { UCBadge, PhaseBadge, PriorityBadge, FlowSteps } from '../../components/premium/PremiumUI';
import { Button } from '../../components/ui/Button';
import LoginPage from '../auth/LoginPage';

const portalNav: Record<string, { to: string; label: string; end?: boolean }[]> = {
  public: [
    { to: '/uc/UC-LS-01', label: 'Tìm kiếm' },
    { to: '/uc/UC-LS-05', label: 'Chi tiết' },
    { to: '/uc/UC-LS-03', label: 'So sánh' },
    { to: '/uc/UC-AI-06', label: 'Gợi ý AI' },
  ],
  agent: [
    { to: '/uc/UC-AN-01', label: 'Dashboard', end: true },
    { to: '/uc/UC-CRM-03', label: 'Pipeline' },
    { to: '/uc/UC-GR-02', label: 'Listing' },
    { to: '/uc/UC-BK-01', label: 'Booking' },
    { to: '/uc/UC-AI-01', label: 'AI Copilot' },
  ],
  admin: [
    { to: '/uc/UC-UX-03', label: 'Dashboard', end: true },
    { to: '/uc/UC-ID-01', label: 'Tenants' },
    { to: '/uc/UC-LS-02', label: 'Moderation' },
    { to: '/uc/UC-TR-01', label: 'Audit' },
    { to: '/uc/UC-PAY-02', label: 'Finance' },
  ],
  developer: [
    { to: '/developer', label: 'Tổng quan', end: true },
    { to: '/uc/UC-GR-01', label: 'Bảng hàng GR' },
    { to: '/uc/UC-GR-04', label: 'Product Graph' },
    { to: '/uc/UC-GR-06', label: 'Import Excel' },
    { to: '/uc/UC-AN-03', label: 'Absorption' },
    { to: '/uc/UC-MKT-01', label: 'Phân phối' },
    { to: '/uc/UC-COM-01', label: 'Hoa hồng' },
    { to: '/uc/UC-TR-02', label: 'Tài liệu' },
  ],
  finance: [
    { to: '/uc/UC-PAY-02', label: 'Đối soát', end: true },
    { to: '/uc/UC-PAY-03', label: 'Refund' },
    { to: '/uc/UC-COM-05', label: 'Commission' },
  ],
  buyer: [
    { to: '/uc/UC-PAY-01', label: 'Thanh toán' },
    { to: '/uc/UC-BK-02', label: 'Theo dõi deal' },
  ],
};

export default function UCScreenPage() {
  const { ucId } = useParams<{ ucId: string }>();
  const uc = ucId ? getUseCase(ucId) : undefined;

  if (!uc) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold">Use case không tồn tại</p>
          <Link to="/catalog" className="text-[#0F4C81] text-sm mt-2 inline-block">← Về Catalog</Link>
        </div>
      </div>
    );
  }

  if (uc.screenType === 'login') {
    return <LoginPage uc={uc} />;
  }

  const nav = portalNav[uc.portal] ?? [];
  const userMenus: Record<string, string> = {
    agent: 'Hoàng Nam',
    admin: 'Quốc Bảo',
    developer: 'Minh Tuấn',
    finance: 'Kim Anh',
    buyer: 'Thu Trang',
  };

  return (
    <PremiumShell
      portal={uc.portal}
      title={uc.title}
      subtitle={`${uc.module} · ${uc.actors}`}
      nav={nav}
      userMenu={userMenus[uc.portal]}
      ucId={uc.id}
    >
      <PageHero
        title={uc.title}
        description={`${uc.actors} · ${uc.fr ?? ''}`}
        badge={
          <div className="flex flex-wrap gap-2">
            <UCBadge id={uc.id} />
            <PhaseBadge phase={uc.phase} />
            <PriorityBadge priority={uc.priority} />
          </div>
        }
        actions={
          <>
            <Link to="/catalog"><Button variant="outline" size="sm">Catalog</Button></Link>
            {uc.route !== `/uc/${uc.id}` && (
              <Link to={uc.route}><Button size="sm">Route: {uc.route}</Button></Link>
            )}
          </>
        }
      />
      <ContentArea>
        <div className="grid xl:grid-cols-4 gap-8">
          <div className="xl:col-span-3">
            <ScreenTemplate uc={uc} />
          </div>
          <div className="xl:col-span-1">
            <div className="glass-card rounded-2xl p-5 sticky top-4 space-y-4">
              <h4 className="font-semibold text-sm text-slate-600">Luồng UC</h4>
              <FlowSteps steps={uc.flow} />
              <hr className="border-slate-100" />
              <div className="text-xs space-y-1 text-slate-500">
                <p><strong>Module:</strong> {uc.module}</p>
                <p><strong>Portal:</strong> {uc.portal}</p>
                <p><strong>Route:</strong> <code className="bg-slate-100 px-1 rounded">{uc.route}</code></p>
              </div>
            </div>
          </div>
        </div>
      </ContentArea>
    </PremiumShell>
  );
}

/** Redirect legacy routes to UC screens */
export function UCRedirect({ ucId }: { ucId: string }) {
  const uc = getUseCase(ucId);
  if (!uc) return <Navigate to="/catalog" replace />;
  return <Navigate to={`/uc/${ucId}`} replace />;
}

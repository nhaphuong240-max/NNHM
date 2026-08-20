import { Link } from 'react-router-dom';
import { Shield, Sparkles } from 'lucide-react';
import type { UseCase } from '../../config/useCases';
import { PremiumShell } from '../../components/premium/PremiumShell';
import { UCBadge, PhaseBadge } from '../../components/premium/PremiumUI';
import { Button } from '../../components/ui/Button';

export default function LoginPage({ uc }: { uc?: UseCase }) {
  return (
    <PremiumShell portal="auth" fullWidth>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-panel rounded-3xl p-8 lg:p-10 shadow-xl">
            <div className="text-center mb-8">
              <div className="h-14 w-14 rounded-2xl premium-gradient mx-auto flex items-center justify-center text-white font-bold text-xl shadow-lg">W</div>
              <h1 className="text-2xl font-bold mt-4 tracking-tight">Đăng nhập WEREAL</h1>
              <p className="text-slate-500 text-sm mt-2">Multi-tenant · JWT · MFA step-up</p>
              {uc && (
                <div className="flex justify-center gap-2 mt-4">
                  <UCBadge id={uc.id} />
                  <PhaseBadge phase={uc.phase} />
                </div>
              )}
            </div>

            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
                <input type="email" defaultValue="agent@agency.vn" className="w-full h-12 mt-1.5 rounded-xl border border-slate-200 px-4 text-sm focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81] outline-none transition-all" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mật khẩu</label>
                <input type="password" defaultValue="••••••••" className="w-full h-12 mt-1.5 rounded-xl border border-slate-200 px-4 text-sm focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81] outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tenant</label>
                <select className="w-full h-12 mt-1.5 rounded-xl border border-slate-200 px-4 text-sm bg-white">
                  <option>Agency ABC (ten_agy_01)</option>
                  <option>Dev Pilot Vinhomes</option>
                </select>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex gap-2 text-xs text-amber-800">
                <Shield className="h-4 w-4 shrink-0 mt-0.5" />
                <span>MFA OTP bắt buộc cho thao tác thanh toán (FR-ID-04)</span>
              </div>

              <Link to="/uc/UC-AN-01">
                <Button className="w-full h-12 text-base">Đăng nhập</Button>
              </Link>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <Link to="/uc/UC-ID-06" className="text-sm text-[#0F4C81] hover:underline flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3" /> SSO Enterprise (Phase 4)
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            UC-ID-03 · Access token 15m · Refresh rotation · X-Tenant-Id header
          </p>
        </div>
      </div>
    </PremiumShell>
  );
}

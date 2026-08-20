import { Link } from 'react-router-dom';
import { MapPin, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { StatCard } from '../../components/premium/PremiumUI';
import { Button } from '../../components/ui/Button';
import { brand } from '../../config/designTokens';

/** Web preview of UC-UX-01 — mirrors apps/mobile Agent app */
export default function AgentMobilePage() {
  return (
    <div className="min-h-screen bg-[#F4F7FA] py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-sm text-slate-600">
            <Smartphone className="h-4 w-4" />
            UC-UX-01 · Agent Mobile
          </div>
          <h1 className="text-2xl font-bold text-primary">WEREAL Agent</h1>
          <p className="text-sm text-slate-500">
            Native app: <code className="text-xs bg-white px-2 py-0.5 rounded">apps/mobile</code>
          </p>
        </div>

        <div className="mx-auto max-w-[320px] rounded-[2rem] border-8 border-slate-800 bg-white overflow-hidden shadow-2xl">
          <div className="premium-gradient px-4 py-3 text-white">
            <p className="font-bold text-center">WEREAL Agent</p>
            <p className="text-xs text-white/70 text-center">Expo · Offline-ready</p>
          </div>

          <div className="bg-amber-500 px-3 py-2 flex items-center justify-center gap-2 text-white text-xs font-semibold">
            <WifiOff className="h-3.5 w-3.5" />
            Demo offline banner
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Hot leads" value={5} highlight />
              <StatCard label="Booking" value={2} />
            </div>

            <div className="rounded-xl border border-border p-3 text-sm">
              <p className="text-xs text-slate-500 font-medium">API backend</p>
              <p className="flex items-center gap-1 text-emerald-600 font-semibold mt-1">
                <Wifi className="h-4 w-4" /> Online
              </p>
            </div>

            <Button className="w-full gap-2">
              <MapPin className="h-4 w-4" />
              Log activity (GPS)
            </Button>
            <Button className="w-full" variant="secondary">
              Quick booking
            </Button>
          </div>

          <div className="flex border-t border-border bg-slate-50">
            {['Trang chủ', 'Leads', 'Giữ chỗ', 'Cá nhân'].map((tab, i) => (
              <div
                key={tab}
                className={`flex-1 py-3 text-center text-[10px] font-semibold ${
                  i === 0 ? 'text-primary' : 'text-slate-400'
                }`}
              >
                {tab}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-3 text-sm">
          <h2 className="font-semibold text-slate-800">Chạy app native</h2>
          <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto">
{`cd WEREAL/apps/mobile
npm install && npm start`}
          </pre>
          <p className="text-slate-600">
            Cần API: <code className="text-xs">cd apps/api && npm run start:dev</code>
          </p>
          <Link
            to="/uc/UC-UX-01"
            className="inline-block text-primary font-medium hover:underline"
          >
            → UC spec UC-UX-01
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400">
          Brand primary {brand.primary} · Phase 2 beta (G2.4)
        </p>
      </div>
    </div>
  );
}

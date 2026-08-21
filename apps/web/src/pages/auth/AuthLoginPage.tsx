import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { DEFAULT_TENANT_ID } from '../../lib/constants';
import {
  completeMfaLogin,
  fetchPublicTenants,
  getSession,
  login,
  MfaRequiredError,
  portalHomeForRole,
  type TenantOption,
} from '../../lib/auth';
import { brand, finance } from '../../theme/tokens';

const DEMO_ACCOUNTS = [
  { label: 'Agent', email: 'agent@sunrise-dev.vn', password: 'Agent123!', role: 'AGENT' },
  {
    label: 'Agency Admin',
    email: 'agency@sunrise-realty.vn',
    password: 'Agency123!',
    role: 'AGENCY_ADMIN',
    tenantId: 'ten_agency_01',
  },
  { label: 'Developer Admin', email: 'admin@sunrise-dev.vn', password: 'DevAdmin123!', role: 'DEVELOPER_ADMIN' },
  { label: 'Finance', email: 'finance@sunrise-dev.vn', password: 'Finance123!', role: 'FINANCE_ADMIN' },
] as const;

type PortalTheme = {
  accent: string;
  accentDark: string;
  title: string;
  subtitle: string;
};

function portalTheme(portal: string | null): PortalTheme {
  switch (portal) {
    case 'finance':
      return {
        accent: finance.accent,
        accentDark: finance.accentDark,
        title: 'Finance Portal',
        subtitle: 'UC-PAY-02 · Đối soát & hoàn tiền',
      };
    case 'developer':
      return {
        accent: brand.primaryDark,
        accentDark: brand.primaryDark,
        title: 'Developer Portal',
        subtitle: 'UC-GR-01 · Golden Record',
      };
    case 'agent':
      return {
        accent: brand.primary,
        accentDark: brand.primaryDark,
        title: 'Agent Portal',
        subtitle: 'UC-BK-01 · Booking & listing',
      };
    case 'admin':
      return {
        accent: brand.primaryDark,
        accentDark: brand.primaryDark,
        title: 'Admin / Ops Portal',
        subtitle: 'Moderation · IAM stub',
      };
    default:
      return {
        accent: brand.primary,
        accentDark: brand.primaryDark,
        title: 'WEREAL Auth',
        subtitle: 'UC-ID-03 · SCR-AUTH-001 · Đa portal',
      };
  }
}

export function AuthLoginPage() {
  const location = useLocation();
  const [params] = useSearchParams();
  const portal = params.get('portal');
  const theme = useMemo(() => portalTheme(portal), [portal]);

  const fromParam = params.get('from');
  const fromState = (location.state as { from?: string } | null)?.from;
  const from = fromParam ?? fromState ?? '/';

  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [tenantId, setTenantId] = useState(DEFAULT_TENANT_ID);
  const [email, setEmail] = useState('agent@sunrise-dev.vn');
  const [password, setPassword] = useState('Agent123!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failCount, setFailCount] = useState(0);
  const [mfaChallenge, setMfaChallenge] = useState<{
    challengeId: string;
    email: string;
    tenantId: string;
  } | null>(null);
  const [mfaOtp, setMfaOtp] = useState('');

  useEffect(() => {
    fetchPublicTenants()
      .then(setTenants)
      .catch(() => undefined);
  }, []);

  if (getSession()) {
    const session = getSession()!;
    const target = from !== '/' ? from : portalHomeForRole(session.role, portal);
    return <Navigate to={target} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (failCount >= 5) {
      setError('Tài khoản tạm khóa 15 phút sau 5 lần sai (demo BR-14).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const session = await login(email, password, tenantId);
      const target = from !== '/' ? from : portalHomeForRole(session.role, portal);
      window.location.href = target;
    } catch (err) {
      if (err instanceof MfaRequiredError) {
        setMfaChallenge({
          challengeId: err.challengeId,
          email: err.email,
          tenantId: err.tenantId,
        });
        setMfaOtp('');
        return;
      }
      setFailCount((c) => c + 1);
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  async function onMfaSubmit(e: FormEvent) {
    e.preventDefault();
    if (!mfaChallenge) return;
    setLoading(true);
    setError(null);
    try {
      const session = await completeMfaLogin(mfaChallenge.challengeId, mfaOtp, mfaChallenge.email);
      const target = from !== '/' ? from : portalHomeForRole(session.role, portal);
      window.location.href = target;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mã MFA không hợp lệ');
    } finally {
      setLoading(false);
    }
  }

  function applyDemo(account: (typeof DEMO_ACCOUNTS)[number]) {
    setEmail(account.email);
    setPassword(account.password);
    if ('tenantId' in account && account.tenantId) {
      setTenantId(account.tenantId);
    } else {
      setTenantId(DEFAULT_TENANT_ID);
    }
    setError(null);
    setMfaChallenge(null);
    setMfaOtp('');
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2" style={{ background: brand.background }}>
      <aside
        className="hidden lg:flex flex-col justify-between p-12 text-white"
        style={{ background: theme.accentDark }}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: brand.accent }}>
            WEREAL
          </p>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight">
            Hệ điều hành
            <br />
            bất động sản
          </h1>
          <p className="mt-4 max-w-sm text-sm opacity-80">
            Giữ chỗ · cọc · sổ cái · hoa hồng trên một tenant. Giao diện cho sale, CĐT và finance.
          </p>
        </div>
        <ul className="space-y-3 text-sm opacity-85">
          <li>Inbox đa kênh — Zalo, Meta, web</li>
          <li>Cọc VNPAY và đối soát ledger</li>
          <li>Ops console — payment, lock, drift</li>
        </ul>
      </aside>

      <div className="flex items-center justify-center p-6 lg:p-12">
      <div
        className="w-full max-w-md rounded-2xl p-8 space-y-5"
        style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accent }}>
            {theme.title}
          </p>
          <h1 className="text-2xl font-extrabold mt-1 tracking-tight" style={{ color: theme.accentDark }}>
            Đăng nhập
          </h1>
          <p className="text-sm mt-2" style={{ color: brand.muted }}>
            {mfaChallenge ? 'Nhập mã TOTP (OTP 123456 bị từ chối trên tenant LIVE).' : theme.subtitle}
          </p>
        </div>

        {mfaChallenge ? (
          <form className="space-y-4" onSubmit={onMfaSubmit}>
            <p className="text-sm" style={{ color: brand.muted }}>
              {mfaChallenge.email}
            </p>
            <label className="block text-sm">
              <span className="font-medium">Mã MFA (TOTP)</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={mfaOtp}
                onChange={(e) => setMfaOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="mt-1 w-full rounded-xl border px-3 py-2.5 tracking-widest"
                style={{ borderColor: brand.border }}
              />
            </label>
            {error && (
              <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading || mfaOtp.length !== 6}
              className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-60"
              style={{ background: theme.accent }}
            >
              {loading ? 'Đang xác thực…' : 'Xác thực MFA'}
            </button>
            <button
              type="button"
              className="w-full text-sm underline"
              style={{ color: brand.muted }}
              onClick={() => {
                setMfaChallenge(null);
                setMfaOtp('');
                setError(null);
              }}
            >
              ← Quay lại đăng nhập
            </button>
          </form>
        ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm">
            <span className="font-medium">Tenant</span>
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
              style={{ borderColor: brand.border }}
            >
              {tenants.length > 0 ? (
                tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.attributes.name} ({t.id})
                  </option>
                ))
              ) : (
                <option value={DEFAULT_TENANT_ID}>{DEFAULT_TENANT_ID}</option>
              )}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium">Email</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2.5"
              style={{ borderColor: brand.border }}
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium">Mật khẩu</span>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 pr-20"
                style={{ borderColor: brand.border }}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs underline px-2"
                style={{ color: brand.muted }}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </label>

          {failCount >= 3 && failCount < 5 && (
            <p className="text-xs rounded-lg p-2" style={{ background: '#FFF7ED', color: brand.warning }}>
              Cảnh báo: {5 - failCount} lần thử còn lại trước khi khóa (demo).
            </p>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || failCount >= 5}
            className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-60"
            style={{ background: theme.accent }}
          >
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
        )}

        <div className="flex flex-wrap gap-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => applyDemo(acc)}
              className="text-xs px-2 py-1 rounded-lg border"
              style={{ borderColor: brand.border, color: brand.primary }}
            >
              {acc.label}
            </button>
          ))}
        </div>

        <p className="text-xs" style={{ color: brand.muted }}>
          Sau login → redirect theo role: Agent / Developer / Finance / Admin
        </p>

        <Link to="/" className="block text-center text-sm underline" style={{ color: brand.muted }}>
          ← Về trang chủ
        </Link>
      </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { setSession } from '../../lib/auth';
import { brand } from '../../theme/tokens';

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const part = token.split('.')[1];
    if (!part) return {};
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function AuthSsoCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const expiresIn = Number(params.get('expiresIn') ?? '900');

    if (!accessToken || !refreshToken) {
      setError('Thiếu token từ SSO callback.');
      return;
    }

    const claims = decodeJwtPayload(accessToken);
    const email = typeof claims.email === 'string' ? claims.email : 'agent@sunrise-dev.vn';
    const tenantId = typeof claims.tenantId === 'string' ? claims.tenantId : 'ten_dev_01';
    const userId = typeof claims.sub === 'string' ? claims.sub : 'usr_agent';
    const role = typeof claims.role === 'string' ? claims.role : 'AGENT';

    setSession({
      accessToken,
      refreshToken,
      tenantId,
      userId,
      email,
      role,
      roles: [role],
      expiresIn,
    });
    navigate('/agent', { replace: true });
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: brand.background }}>
      <div className="text-center space-y-3">
        {error ? (
          <>
            <p className="text-red-600 text-sm">{error}</p>
            <Link to="/auth/sso" className="text-sm underline">
              Thử lại SSO
            </Link>
          </>
        ) : (
          <p style={{ color: brand.muted }}>Đang hoàn tất đăng nhập SSO…</p>
        )}
      </div>
    </div>
  );
}

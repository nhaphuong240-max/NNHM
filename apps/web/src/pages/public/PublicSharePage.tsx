import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { openShareLink } from '../../lib/api';

/** P1 FR-DSR-004 — branded share link open + redirect. */
export function PublicSharePage() {
  const { token = '' } = useParams<{ token: string }>();
  const [redirect, setRedirect] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void openShareLink(token)
      .then((res) => setRedirect(res.data.redirect))
      .catch((e) => setError(e instanceof Error ? e.message : 'Link không hợp lệ'));
  }, [token]);

  if (redirect) return <Navigate to={redirect} replace />;
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-sm text-red-600">
        {error}
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-sm text-slate-500">
      Đang mở liên kết…
    </div>
  );
}

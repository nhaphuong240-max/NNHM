import { Navigate, useLocation } from 'react-router-dom';

/** Unified auth — redirect legacy finance login to SCR-AUTH-001 */
export function FinanceLoginPage() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/finance/reconciliation';
  const qs = new URLSearchParams({ portal: 'finance', from });
  return <Navigate to={`/auth/login?${qs.toString()}`} replace />;
}

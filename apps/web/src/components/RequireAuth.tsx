import { Navigate, useLocation } from 'react-router-dom';
import { getSession } from '../lib/auth';

export function RequireAuth({
  children,
  loginPath = '/auth/login',
}: {
  children: React.ReactNode;
  loginPath?: string;
}) {
  const location = useLocation();
  const session = getSession();

  if (!session) {
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }

  return children;
}

import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useProfile } from '../hooks/auth/useProfile';
import { FullScreenSpinner } from './FullScreenSpinner';
import { ConnectionErrorScreen } from './ConnectionErrorScreen';
import { OrphanProfileError } from './OrphanProfileError';

export function RequireClient({ children }: { children: ReactNode }) {
  const profile = useProfile();
  const location = useLocation();

  if (profile.status === 'idle' || profile.status === 'loading') return <FullScreenSpinner />;
  if (profile.status === 'error') return <ConnectionErrorScreen onRetry={profile.refetch} />;
  if (profile.status === 'orphan') return <OrphanProfileError />;
  if (profile.profile.is_admin) return <Navigate to="/admin" replace />;

  const status = profile.profile.status;
  const path = location.pathname;
  if (path === '/aguardando' && !(status === 'lead' || status === 'rejeitado')) {
    return <Navigate to="/liberado" replace />;
  }
  if (path === '/liberado' && (status === 'lead' || status === 'rejeitado')) {
    return <Navigate to="/aguardando" replace />;
  }
  return <>{children}</>;
}

import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useProfile } from '../hooks/auth/useProfile';
import { FullScreenSpinner } from './FullScreenSpinner';
import { ConnectionErrorScreen } from './ConnectionErrorScreen';
import { OrphanProfileError } from './OrphanProfileError';
import { smartRedirect } from './RequireGuest';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const profile = useProfile();

  if (profile.status === 'idle' || profile.status === 'loading') return <FullScreenSpinner />;
  if (profile.status === 'error') return <ConnectionErrorScreen onRetry={profile.refetch} />;
  if (profile.status === 'orphan') return <OrphanProfileError />;
  if (!profile.profile.is_admin) return <Navigate to={smartRedirect(profile)} replace />;
  return <>{children}</>;
}

import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/auth/useAuth';
import { useProfile } from '../hooks/auth/useProfile';
import { FullScreenSpinner } from './FullScreenSpinner';

export function smartRedirect(profile: ReturnType<typeof useProfile>): string {
  if (profile.status !== 'ready') return '/';
  if (profile.profile.is_admin) return '/admin';
  const status = profile.profile.status;
  if (status === 'lead' || status === 'rejeitado') return '/aguardando';
  return '/liberado';
}

export function RequireGuest({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const profile = useProfile();

  if (auth.status === 'loading' || (auth.status === 'authenticated' && (profile.status === 'loading' || profile.status === 'idle'))) {
    return <FullScreenSpinner />;
  }
  if (auth.status === 'authenticated') {
    return <Navigate to={smartRedirect(profile)} replace />;
  }
  return <>{children}</>;
}

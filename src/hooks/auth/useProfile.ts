import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase/client';
import type { Profile } from '../../lib/supabase/types';
import { useAuth } from './useAuth';

export type ProfileState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; profile: Profile }
  | { status: 'orphan' }
  | { status: 'error'; error: Error };

export function useProfile(): ProfileState & { refetch: () => void } {
  const auth = useAuth();
  const [state, setState] = useState<ProfileState>({ status: 'idle' });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (auth.status !== 'authenticated') {
      setState({ status: 'idle' });
      return;
    }
    let mounted = true;
    setState({ status: 'loading' });

    supabase
      .from('profiles')
      .select('*')
      .eq('id', auth.session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setState({ status: 'error', error: new Error(error.message) });
          return;
        }
        if (!data) {
          setState({ status: 'orphan' });
          return;
        }
        setState({ status: 'ready', profile: data });
      });

    return () => {
      mounted = false;
    };
  }, [auth, tick]);

  return { ...state, refetch: () => setTick((t) => t + 1) };
}

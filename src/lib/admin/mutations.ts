import { supabase } from '../supabase/client';

export async function releaseClient(clientId: string) {
  const { data, error } = await supabase.functions.invoke('release-client', {
    body: { clientId },
  });
  if (error) return { ok: false as const, error };
  return { ok: true as const, data };
}

export async function rejectClient(clientId: string, motivo: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'rejeitado', motivo_rejeicao: motivo })
    .eq('id', clientId)
    .eq('status', 'lead');
  return error ? { ok: false as const, error } : { ok: true as const };
}

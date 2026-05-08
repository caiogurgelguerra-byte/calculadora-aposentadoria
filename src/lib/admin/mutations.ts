import { supabase } from '../supabase/client';

export async function releaseClient(clientId: string) {
  const { data, error } = await supabase.functions.invoke('release-client', {
    body: { clientId },
  });
  if (error) return { ok: false as const, error };
  return { ok: true as const, data };
}

export async function rejectClient(clientId: string, motivo: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase
    .from('profiles') as any)
    .update({
      status: 'rejeitado',
      motivo_rejeicao: motivo,
    })
    .eq('id', clientId)
    .eq('status', 'lead');
  return error ? { ok: false as const, error } : { ok: true as const };
}

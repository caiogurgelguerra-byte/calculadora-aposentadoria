import { supabase } from '../supabase/client';
import type { ProfileWithEmail } from '../supabase/types';

export async function listClients(): Promise<ProfileWithEmail[]> {
  const { data, error } = await supabase
    .from('profiles_with_email')
    .select('*')
    .eq('is_admin', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getClientById(id: string): Promise<ProfileWithEmail | null> {
  const { data } = await supabase
    .from('profiles_with_email')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data;
}

export function findDuplicates(profiles: ProfileWithEmail[]): Map<string, ProfileWithEmail[]> {
  const byKey = new Map<string, ProfileWithEmail[]>();
  for (const p of profiles) {
    const keys = [
      `tel:${p.telefone}`,
      `nome:${p.nome_completo.toLowerCase()}|${p.data_nascimento}`,
    ];
    for (const k of keys) {
      const list = byKey.get(k) ?? [];
      list.push(p);
      byKey.set(k, list);
    }
  }
  return new Map(Array.from(byKey).filter(([_, list]) => list.length > 1));
}

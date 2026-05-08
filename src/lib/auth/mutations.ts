import { supabase } from '../supabase/client';
import type { CadastroForm, RedefinirSenhaForm, MeusDadosForm } from './schemas';

const APP_URL = import.meta.env.VITE_SUPABASE_URL
  ? window.location.origin
  : 'http://localhost:5173';

export async function signUp(data: CadastroForm) {
  const { email, senha, website, ...meta } = data;

  // Honeypot acionado: rejeita silenciosamente
  if (website && website.length > 0) {
    return { ok: false as const, reason: 'honeypot' };
  }

  const { data: result, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      emailRedirectTo: `${APP_URL}/login`,
      data: {
        nome_completo: meta.nome_completo,
        data_nascimento: meta.data_nascimento.toISOString().slice(0, 10),
        estado_civil: meta.estado_civil,
        dependentes: meta.dependentes,
        profissao: meta.profissao,
        regime_trabalho: meta.regime_trabalho,
        cidade: meta.cidade,
        uf: meta.uf,
        telefone: meta.telefone,
      },
    },
  });

  if (error) return { ok: false as const, reason: 'error' as const, error };

  // Anti-enumeration do Supabase: identities vazias = email já cadastrado
  if (result.user && (!result.user.identities || result.user.identities.length === 0)) {
    return { ok: false as const, reason: 'duplicate' as const };
  }

  return { ok: true as const };
}

export async function signIn(email: string, senha: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  return error ? { ok: false as const, error } : { ok: true as const };
}

export async function signOut() {
  await supabase.auth.signOut(); // global por default
}

export async function resendConfirmation(email: string) {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  return error ? { ok: false as const, error } : { ok: true as const };
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${APP_URL}/redefinir-senha`,
  });
  return error ? { ok: false as const, error } : { ok: true as const };
}

export async function updatePassword(form: RedefinirSenhaForm) {
  const { error } = await supabase.auth.updateUser({ password: form.senha });
  if (error) return { ok: false as const, error };
  await supabase.auth.signOut(); // força reauth com senha nova em todos os devices
  return { ok: true as const };
}

export async function updateOwnProfile(userId: string, form: MeusDadosForm) {
  // Type assertion needed due to Supabase client type inference limitations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profilesTable = supabase.from('profiles') as any;
  const updateQuery = profilesTable.update({
    nome_completo: form.nome_completo,
    data_nascimento: form.data_nascimento.toISOString().slice(0, 10),
    estado_civil: form.estado_civil,
    dependentes: form.dependentes,
    profissao: form.profissao,
    regime_trabalho: form.regime_trabalho,
    cidade: form.cidade,
    uf: form.uf,
    telefone: form.telefone,
  });

  const { error } = await updateQuery.eq('id', userId);

  return error ? { ok: false as const, error } : { ok: true as const };
}

export async function deleteOwnAccount() {
  // Chama Edge Function delete-own-account (criada na Task 31)
  const { data, error } = await supabase.functions.invoke('delete-own-account');
  if (error) return { ok: false as const, error };
  if (data?.error === 'cannot_delete_last_admin') {
    return { ok: false as const, reason: 'last_admin' as const };
  }
  // Limpa storage local; auth.users já foi deletado pela Edge Function
  await supabase.auth.signOut({ scope: 'local' });
  return { ok: true as const };
}

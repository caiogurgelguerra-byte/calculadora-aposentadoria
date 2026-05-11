import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, respond } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // 1. Validar JWT
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return respond({ error: 'unauthorized' }, 401);

    // 2. Ler nome antes da deleção
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: profile } = await admin
      .from('profiles').select('nome_completo').eq('id', user.id).single();
    const email = user.email!;
    const nome = profile?.nome_completo ?? '<sem nome>';

    // 3. Deletar auth.users (cascateia profile)
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) {
      if (delErr.message?.toLowerCase().includes('last admin') ||
          delErr.message?.toLowerCase().includes('último admin')) {
        return respond({ error: 'cannot_delete_last_admin' }, 409);
      }
      throw delErr;
    }

    // 4. Disparar 2 emails em paralelo
    const resendKey = Deno.env.get('RESEND_API_KEY')!;
    const adminEmail = Deno.env.get('ADMIN_NOTIFICATION_EMAIL')!;
    const ts = new Date().toISOString();

    const titularBody = {
      from: 'Meu Mapa Financeiro <noreply@meumapafinanceiro.ia.br>',
      to: email,
      subject: 'Sua conta foi excluída — Meu Mapa Financeiro',
      text: `Olá, ${nome}!

Confirmamos que sua conta no Meu Mapa Financeiro foi excluída em ${ts}, conforme seu pedido (LGPD Art. 18).

Os dados pessoais associados (cadastro, registros de autenticação) foram removidos dos nossos sistemas. Backups técnicos podem reter cópias residuais por até 30 dias antes da rotação automática, conforme política de privacidade.

Em caso de dúvida, fale comigo: caio.gurgel.guerra@gmail.com.
`,
    };

    const adminBody = {
      from: 'Meu Mapa Financeiro <noreply@meumapafinanceiro.ia.br>',
      to: adminEmail,
      subject: `Cliente solicitou exclusão LGPD — ${nome}`,
      text: `Cliente ${nome} (id: ${user.id}, email: ${email}) usou o botão "Excluir minha conta" em ${ts}.

A exclusão de auth.users + profile já foi concluída tecnicamente.
Resta: registrar na planilha LGPD Art. 37 (tipo_operacao=eliminacao_titular_self_service).
`,
    };

    await Promise.allSettled([
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(titularBody),
      }),
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(adminBody),
      }),
    ]);

    return respond({ ok: true });
  } catch (e) {
    console.error('delete-own-account exception:', e);
    return respond({ error: 'internal' }, 500);
  }
});

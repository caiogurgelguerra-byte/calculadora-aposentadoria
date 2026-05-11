import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, respond } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // 1. Validar JWT do chamador
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return respond({ error: 'unauthorized' }, 401);

    // 2. Re-derivar is_admin via service_role
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: callerProfile } = await admin
      .from('profiles').select('is_admin').eq('id', user.id).single();
    if (!callerProfile?.is_admin) return respond({ error: 'forbidden' }, 403);

    // 3. UPDATE atomic com guard de idempotência
    const { clientId } = (await req.json()) as { clientId: string };
    const { data: updated } = await admin
      .from('profiles')
      .update({ status: 'liberado' })
      .eq('id', clientId)
      .eq('status', 'lead')
      .select('id, nome_completo')
      .maybeSingle();

    if (!updated) return respond({ ok: true, alreadyReleased: true });

    // 4. Email para o cliente
    const { data: u } = await admin.auth.admin.getUserById(clientId);
    const email = u?.user?.email;
    if (!email) return respond({ ok: true, emailSent: false });

    const appUrl = Deno.env.get('APP_URL')!;
    const text = `Olá, ${updated.nome_completo}!

Seu acesso foi liberado. Em breve entraremos em contato para combinarmos os próximos passos.

Acesse o portal: ${appUrl}/login

Este é um e-mail transacional, parte da execução do serviço. Não é oferta nem recomendação de produto financeiro (ver Termos de Uso: ${appUrl}/termos).

—
Caio Guerra
Meu Mapa Financeiro · meumapafinanceiro.ia.br
`;
    const html = text.replace(/\n/g, '<br>');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Meu Mapa Financeiro <noreply@meumapafinanceiro.ia.br>',
        to: email,
        subject: 'Seu acesso foi liberado — Meu Mapa Financeiro',
        text, html,
      }),
    });

    return respond({ ok: true, emailSent: res.ok });
  } catch (e) {
    console.error('release-client exception:', e);
    return respond({ error: 'internal' }, 500);
  }
});

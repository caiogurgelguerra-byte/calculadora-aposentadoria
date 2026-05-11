import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

Deno.serve(async () => {
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data } = await admin
      .from('profiles')
      .select('id, nome_completo, created_at')
      .eq('is_admin', false)
      .eq('status', 'lead')
      .lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!data || data.length === 0) return new Response('no orphans', { status: 200 });

    const adminEmail = Deno.env.get('ADMIN_NOTIFICATION_EMAIL')!;
    const lines = data.map((p) => `- ${p.nome_completo} (${p.id}) cadastrado ${p.created_at}`).join('\n');
    const text = `Auditoria de leads (janela 1h–24h):

${lines}

Esses leads NÃO foram notificados via webhook normal. Verificar Edge Function logs e Resend.
`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Meu Mapa Financeiro <noreply@meumapafinanceiro.ia.br>',
        to: adminEmail,
        subject: `[Auditoria] ${data.length} lead(s) órfão(s)`,
        text, html: text.replace(/\n/g, '<br>'),
      }),
    });

    return new Response('ok', { status: 200 });
  } catch (e) {
    console.error('audit-orphan-leads exception:', e);
    return new Response('error', { status: 500 });
  }
});

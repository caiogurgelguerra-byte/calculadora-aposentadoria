import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { timingSafeEqual } from 'node:crypto';

interface WebhookPayload {
  type: 'INSERT';
  table: 'profiles';
  record: {
    id: string;
    nome_completo: string;
    cidade: string;
    uf: string;
    is_admin: boolean;
    status: string;
  };
}

Deno.serve(async (req) => {
  try {
    // 1. Validar header timing-safe
    const enc = new TextEncoder();
    const got = enc.encode(req.headers.get('x-webhook-secret') ?? '');
    const want = enc.encode(Deno.env.get('WEBHOOK_SECRET')!);
    if (got.length !== want.length || !timingSafeEqual(got, want)) {
      return new Response('unauthorized', { status: 401 });
    }

    // 2. Validar payload
    const payload = (await req.json()) as WebhookPayload;
    const r = payload?.record;
    if (!r || r.is_admin !== false || r.status !== 'lead') {
      return new Response('skipped', { status: 200 });
    }

    // 3. Lookup email via service_role
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: u } = await admin.auth.admin.getUserById(r.id);
    const email = u?.user?.email ?? '<email indisponível>';

    // 4. Enviar via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY')!;
    const adminEmail = Deno.env.get('ADMIN_NOTIFICATION_EMAIL')!;
    const appUrl = Deno.env.get('APP_URL')!;

    const text = `Novo lead cadastrado no Meu Mapa Financeiro.

Nome: ${r.nome_completo}
Email: ${email}
Cidade/UF: ${r.cidade}/${r.uf}

Acesse o painel admin para revisar: ${appUrl}/admin
`;
    const html = text.replace(/\n/g, '<br>');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Meu Mapa Financeiro <noreply@meumapafinanceiro.ia.br>',
        to: adminEmail,
        subject: `Novo lead: ${r.nome_completo}`,
        text, html,
      }),
    });

    if (!res.ok) {
      console.error('Resend falhou:', await res.text());
    }

    return new Response('ok', { status: 200 });
  } catch (e) {
    console.error('notify-new-lead exception:', e);
    return new Response('ok', { status: 200 }); // pg_net não retenta — sempre 200
  }
});

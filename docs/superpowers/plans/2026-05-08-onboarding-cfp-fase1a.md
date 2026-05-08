# Onboarding CFP Fase 1A — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar fluxo de captação + onboarding de clientes para consultoria CFP ao portal `meumapafinanceiro.ia.br` — auth (cadastro/login/recovery), admin minimalista (lista + liberar/recusar), emails transacionais via Resend, política LGPD-compliant.

**Architecture:** Frontend React+Vite existente intacto; nova camada Supabase (Auth + Postgres + RLS + Database Webhook + 4 Edge Functions Deno) + Resend para emails; integração com EasyPanel via env vars. Tudo coexiste com calculadoras públicas em `src/lib/aposentadoria/` e `src/lib/salario/`.

**Tech Stack:** React 18 + Vite 6 + TypeScript + Tailwind + react-router-dom 7 (existente); Supabase (auth + Postgres + Edge Functions); `@supabase/supabase-js`, `react-hook-form`, `zod`, `@hookform/resolvers`, `sonner`, `@headlessui/react` (novos); Resend para email; `pg_cron` para auto-auditoria.

**Spec:** `docs/superpowers/specs/2026-05-07-onboarding-cfp-fase1a-design.md` é fonte da verdade. Quando o plano referenciar §X, é seção do spec.

**Workflow do projeto:** commits diretos no master; testes só em lógica real (parser, sanitização, SQL). Validação principal = smoke test (§7.7) + teste RLS via curl (§7.5) ao final.

---

## Fase A — Setup e fundação

### Task 1: Criar projeto Supabase + configurar Auth + secrets

**Files:** (configuração externa, sem arquivos no repo)

- [ ] **Step 1: Criar projeto Supabase produção em supabase.com**

Acessar https://supabase.com → New project → nome `meumapafinanceiro-prod`, região São Paulo (sa-east-1), senha de banco forte. Aguardar provisionamento (~2 min). Copiar `Project URL` e `anon public key` da página Settings → API.

- [ ] **Step 2: Criar projeto Supabase staging (espelho)**

Repetir Step 1 com nome `meumapafinanceiro-staging`. Free tier permite 2 projetos por org. Usado para smoke tests destrutivos (§7.7 caso "RESEND_API_KEY inválida"). Copiar URL e anon key separadamente.

- [ ] **Step 3: Configurar Auth → Settings (em ambos projetos)**

Authentication → Settings:
- "Enable Email Provider" = ON
- "Confirm email" = ON
- "Enable signups" = ON
- "JWT expiry" = `3600` (1h)
- "Refresh Token Lifetime" = `86400` (24h)

- [ ] **Step 4: Configurar Redirect URLs no Auth → URL Configuration (em ambos projetos)**

Adicionar em "Redirect URLs":
```
https://www.meumapafinanceiro.ia.br/redefinir-senha
https://www.meumapafinanceiro.ia.br/login
http://localhost:5173/redefinir-senha
http://localhost:5173/login
```

Site URL: `https://www.meumapafinanceiro.ia.br`.

- [ ] **Step 5: Criar conta Resend e gerar API key**

Acessar https://resend.com → criar conta com `caio.gurgel.guerra@gmail.com` → API Keys → Create API Key (escopo Full access, prod). Salvar em local seguro. Repetir para staging com key separada.

- [ ] **Step 6: Configurar Function Secrets no Supabase (ambos projetos)**

`supabase secrets set` ou painel Edge Functions → Secrets:
```
RESEND_API_KEY=re_...                              # diferente entre prod/staging
ADMIN_NOTIFICATION_EMAIL=caio.gurgel.guerra@gmail.com
APP_URL=https://www.meumapafinanceiro.ia.br        # ou http://localhost:5173 em staging
WEBHOOK_SECRET=$(openssl rand -base64 32 | tr '+/' '-_' | tr -d '=')
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` são auto-injetadas (não precisam ser configuradas).

- [ ] **Step 7: Configurar env vars no EasyPanel (produção)**

Painel EasyPanel → projeto do portal → Environment:
```
VITE_SUPABASE_URL=https://<projeto-prod>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Para dev local, adicionar `.env.local` (gitignored) com mesmos valores apontando para staging.

- [ ] **Step 8: Adicionar `.env.local` ao .gitignore (se ainda não estiver)**

Verificar:
```bash
grep -E "^\.env\.local$|^\.env$" .gitignore || echo -e "\n.env\n.env.local" >> .gitignore
```

- [ ] **Step 9: Commit (apenas .gitignore se mudou)**

```bash
git add .gitignore
git diff --cached --quiet || git commit -m "chore: ignore .env files for Supabase config"
```

---

### Task 2: Adicionar dependências NPM novas

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar dependências de runtime**

```bash
npm install @supabase/supabase-js@^2.45.0 react-hook-form@^7.53.0 zod@^3.23.0 @hookform/resolvers@^3.9.0 sonner@^1.5.0 @headlessui/react@^2.1.0
```

Versões pinadas (sem caret no package.json após install) por orientação do spec §3.3 — `identities.length === 0` é frágil entre versões.

- [ ] **Step 2: Travar versão exata do `@supabase/supabase-js`**

Editar `package.json` removendo o `^` do `@supabase/supabase-js`:
```json
"@supabase/supabase-js": "2.45.0",
```

(Ou da versão exata que `npm install` resolveu.)

- [ ] **Step 3: Verificar build limpo**

```bash
npm run build
```

Expected: `vite build` completa sem erros (TypeScript ainda não usa nada disso).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add Supabase, RHF, Zod, sonner, HeadlessUI deps for onboarding CFP"
```

---

### Task 3: Cliente Supabase + tipos do schema

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/types.ts`

- [ ] **Step 1: Criar `src/lib/supabase/client.ts`**

```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios');
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
```

- [ ] **Step 2: Criar `src/lib/supabase/types.ts`**

```ts
export type ClientStatus =
  | 'lead'
  | 'rejeitado'
  | 'liberado'
  | 'em_onboarding'
  | 'submetido'
  | 'em_consultoria'
  | 'concluido';

export type EstadoCivil = 'solteiro' | 'casado' | 'uniao_estavel' | 'divorciado' | 'viuvo';

export type RegimeTrabalho =
  | 'clt'
  | 'pj'
  | 'autonomo'
  | 'servidor_publico'
  | 'empresario'
  | 'aposentado'
  | 'outro';

export interface Profile {
  id: string;
  nome_completo: string;
  data_nascimento: string;
  estado_civil: EstadoCivil;
  dependentes: number[];
  profissao: string;
  regime_trabalho: RegimeTrabalho;
  cidade: string;
  uf: string;
  telefone: string;
  status: ClientStatus;
  is_admin: boolean;
  motivo_rejeicao: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileWithEmail extends Profile {
  email: string | null;
  last_sign_in_at: string | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
    };
    Views: {
      profiles_with_email: { Row: ProfileWithEmail };
    };
    Enums: {
      client_status: ClientStatus;
      estado_civil: EstadoCivil;
      regime_trabalho: RegimeTrabalho;
    };
  };
}
```

- [ ] **Step 3: Adicionar `vite-env.d.ts` types para env vars**

Modificar `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 4: Verificar build**

```bash
npm run build
```

Expected: build limpo (cliente Supabase compila com tipos).

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/ src/vite-env.d.ts
git commit -m "feat(supabase): cliente singleton + tipos derivados do schema"
```

---

### Task 4: Helpers de WhatsApp + versão da política

**Files:**
- Create: `src/lib/contact/whatsapp.ts`
- Create: `src/lib/legal/version.ts`

- [ ] **Step 1: Criar `src/lib/legal/version.ts`**

```ts
export const POLICY_LAST_UPDATED = '2026-05-08';
export const TERMS_LAST_UPDATED = '2026-05-08';
```

(Atualizar manualmente nas revisões da política/termos, conforme spec §3.10 item 10.)

- [ ] **Step 2: Criar `src/lib/contact/whatsapp.ts`**

```ts
const WHATSAPP_DDD = '85';      // ajustar conforme bloqueador externo A.1
const WHATSAPP_NUM = '999999999'; // ajustar conforme bloqueador externo A.1

type Context =
  | 'aguardando'
  | 'liberado'
  | 'email_errado'
  | 'orfao'
  | 'duvida_geral'
  | 'conta_excluida';

const TEMPLATES: Record<Context, (vars: Record<string, string>) => string> = {
  aguardando: ({ nome }) =>
    `Olá Caio, sou ${nome || '<seu nome>'} e quero saber sobre o status do meu cadastro.`,
  liberado: () => 'Olá Caio, fui liberado e quero combinar próximos passos.',
  email_errado: () => 'Olá Caio, errei o email no cadastro e preciso refazer.',
  orfao: ({ email }) =>
    `Olá Caio, deu erro no meu cadastro (sou ${email || '<seu email>'}).`,
  duvida_geral: () => '',
  conta_excluida: () => 'Olá Caio, tenho uma dúvida sobre minha conta excluída.',
};

export function whatsappUrl(context: Context, vars: Record<string, string> = {}): string {
  const text = TEMPLATES[context](vars);
  const params = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/55${WHATSAPP_DDD}${WHATSAPP_NUM}${params}`;
}
```

- [ ] **Step 3: Verificar build**

```bash
npm run build
```

Expected: build limpo.

- [ ] **Step 4: Commit**

```bash
git add src/lib/legal/ src/lib/contact/
git commit -m "feat: helpers de WhatsApp por contexto + versão da política"
```

---

## Fase B — Banco de dados (Migration)

### Task 5: Migration SQL — enums, tabela, triggers, RLS, view

**Files:**
- Create: `supabase/migrations/20260508000001_init_profiles.sql`

- [ ] **Step 1: Criar diretório supabase/migrations**

```bash
mkdir -p supabase/migrations supabase/functions
```

- [ ] **Step 2: Criar arquivo de migration completo**

Criar `supabase/migrations/20260508000001_init_profiles.sql` com o conteúdo SQL completo da §2.1 do spec — copiar literalmente as seções:
- Enums (DO blocks idempotentes — `client_status`, `estado_civil`, `regime_trabalho`)
- Tabela `profiles` com CHECK constraints (UF, telefone)
- Índices `profiles_status_idx`, `profiles_created_at_idx`, `profiles_admin_list_idx` (parcial)
- Trigger `set_updated_at`
- Trigger `handle_new_user` com whitelist de exceções (`invalid_text_representation`, `invalid_datetime_format`, `invalid_parameter_value`) tanto nos sub-blocks quanto no exception handler global
- Trigger `profiles_validate_domain` com floor de 18 anos (`current_date - interval '18 years'`)
- Helper `is_admin()` SECURITY DEFINER + `set search_path = ''`
- Trigger `profiles_protect_columns`
- Trigger `profiles_prevent_self_demote`
- Trigger `profiles_prevent_last_admin_delete`
- Policies RLS (`profiles_select`, `profiles_insert`, `profiles_update_self`, `profiles_update_admin`, `profiles_delete_self`, `profiles_delete_admin`)
- View `profiles_with_email` com `security_barrier = true` + filtro `where (auth.uid() = p.id or public.is_admin())` + grant
- Comentários extensos do spec §2.2 sobre owner da view e fragilidade do filtro

- [ ] **Step 3: Aplicar migration no projeto staging via Supabase CLI**

```bash
npx supabase login
npx supabase link --project-ref <staging-ref>
npx supabase db push
```

Alternativa sem CLI: copiar o SQL no SQL Editor do Studio do staging e executar.

- [ ] **Step 4: Validar criação no Studio (staging)**

Database → Tables: confirmar `profiles` com 16 colunas. Database → Functions: confirmar `is_admin`, `handle_new_user`, `set_updated_at`, `profiles_validate_domain`, `profiles_protect_columns`, `profiles_prevent_self_demote`, `profiles_prevent_last_admin_delete`. Database → Triggers em `profiles`: 6 triggers; em `auth.users`: 1 (`on_auth_user_created`). Authentication → Policies: 6 policies em `profiles`.

- [ ] **Step 5: Validar idempotência rodando migration 2x**

Reaplicar a mesma migration no SQL Editor do staging. Expected: zero erros (DO blocks tratam `duplicate_object` dos enums; `create or replace` cobre funções/triggers/policies). Confirmar no log: `NOTICE: ... already exists, skipping` quando aplicável.

- [ ] **Step 6: Aplicar migration no projeto produção**

```bash
npx supabase link --project-ref <prod-ref>
npx supabase db push
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(supabase): migration inicial — profiles + RLS + triggers + view"
```

---

### Task 6: Setup admin via Studio + SQL (em produção e staging)

**Files:** (operação manual no Studio)

- [ ] **Step 1: Em STAGING — criar auth.user de admin de teste**

Studio staging → Authentication → Users → "Add user" (Auto Confirm User = ON):
- Email: `admin@test.com`
- Password: senha forte (anotar em cofre)

- [ ] **Step 2: Em STAGING — inserir profile do admin via SQL Editor**

```sql
insert into public.profiles (
  id, nome_completo, data_nascimento, estado_civil, dependentes,
  profissao, regime_trabalho, cidade, uf, telefone,
  status, is_admin
) values (
  (select id from auth.users where email = 'admin@test.com'),
  'Admin Teste', '1990-01-01', 'solteiro', '{}',
  'Planejador Financeiro CFP', 'autonomo', 'Fortaleza', 'CE', '+5585999999999',
  'liberado', true
);
```

Esperado: `INSERT 0 1`.

- [ ] **Step 3: Em PRODUÇÃO — criar auth.user do Caio**

Studio prod → Authentication → Users → "Add user" (Auto Confirm User = ON):
- Email: `caio.gurgel.guerra@gmail.com`
- Password: senha forte (anotar em cofre digital — ver runbook §4.4 sucessão)

- [ ] **Step 4: Em PRODUÇÃO — inserir profile real do Caio**

No SQL Editor da prod, executar com **dados reais** (não placeholder):

```sql
insert into public.profiles (
  id, nome_completo, data_nascimento, estado_civil, dependentes,
  profissao, regime_trabalho, cidade, uf, telefone,
  status, is_admin
) values (
  (select id from auth.users where email = 'caio.gurgel.guerra@gmail.com'),
  'Caio Gurgel Guerra',
  '<DATA_NASC_REAL>'::date,    -- substituir por data real (>= 18 anos)
  'solteiro',                   -- ajustar
  '{}',
  'Planejador Financeiro CFP',
  'autonomo',                   -- ajustar
  '<CIDADE_REAL>',
  '<UF_REAL>',                  -- 2 letras maiúsculas
  '<TELEFONE_E164>',            -- formato +55XXXXXXXXXXX
  'liberado',
  true
);
```

Esperado: `INSERT 0 1`. Se der erro de validate_domain (idade<18), confirmar data correta.

- [ ] **Step 5: Validar via SQL**

```sql
select id, nome_completo, status, is_admin, data_nascimento
from public.profiles
where is_admin = true;
```

Expected: 1 linha com `is_admin = true` e `status = 'liberado'`.

- [ ] **Step 6: (sem commit — operação manual)**

Documentar em planilha LGPD Art. 37 (criada como parte do bloqueador A.1).

---

## Fase C — Auth core (hooks + lib)

### Task 7: `useAuth` hook (sessão Supabase)

**Files:**
- Create: `src/hooks/auth/useAuth.ts`

- [ ] **Step 1: Criar `src/hooks/auth/useAuth.ts`**

```ts
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase/client';

export type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; session: Session }
  | { status: 'unauthenticated' };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setState(session ? { status: 'authenticated', session } : { status: 'unauthenticated' });
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState(session ? { status: 'authenticated', session } : { status: 'unauthenticated' });
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Expected: build limpo.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/auth/useAuth.ts
git commit -m "feat(auth): hook useAuth com discriminated union (loading/authenticated/unauthenticated)"
```

---

### Task 8: `useProfile` hook com discriminated union

**Files:**
- Create: `src/hooks/auth/useProfile.ts`

- [ ] **Step 1: Criar `src/hooks/auth/useProfile.ts`**

```ts
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
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Expected: build limpo.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/auth/useProfile.ts
git commit -m "feat(auth): hook useProfile com estados discretos (idle/loading/ready/orphan/error)"
```

---

### Task 9: `safeNext` (sanitização anti open-redirect) — TDD

**Files:**
- Create: `src/lib/auth/safe-next.ts`
- Create: `src/lib/auth/safe-next.test.ts`

- [ ] **Step 1: Criar teste falho `src/lib/auth/safe-next.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('retorna / quando input é null/undefined/vazio', () => {
    expect(safeNext(null)).toBe('/');
    expect(safeNext('')).toBe('/');
  });

  it('aceita path relativo válido', () => {
    expect(safeNext('/admin')).toBe('/admin');
    expect(safeNext('/aguardando')).toBe('/aguardando');
  });

  it('rejeita URL absoluta', () => {
    expect(safeNext('https://evil.com')).toBe('/');
    expect(safeNext('http://evil.com/path')).toBe('/');
  });

  it('rejeita protocol-relative //evil.com', () => {
    expect(safeNext('//evil.com')).toBe('/');
    expect(safeNext('//evil.com/admin')).toBe('/');
  });

  it('rejeita path com whitespace ou backslash', () => {
    expect(safeNext('/path with space')).toBe('/');
    expect(safeNext('/path\\evil')).toBe('/');
    expect(safeNext('/path\nevil')).toBe('/');
  });

  it('rejeita path que não começa com /', () => {
    expect(safeNext('admin')).toBe('/');
    expect(safeNext('javascript:alert(1)')).toBe('/');
  });
});
```

- [ ] **Step 2: Rodar teste — confirmar que falha**

```bash
npm test -- safe-next
```

Expected: FAIL com `Cannot find module './safe-next'`.

- [ ] **Step 3: Implementar `src/lib/auth/safe-next.ts`**

```ts
export function safeNext(raw: string | null | undefined): string {
  if (!raw) return '/';
  if (!raw.startsWith('/')) return '/';
  if (raw.startsWith('//')) return '/';
  if (/[\s\\]/.test(raw)) return '/';
  return raw;
}
```

- [ ] **Step 4: Rodar teste — confirmar que passa**

```bash
npm test -- safe-next
```

Expected: PASS (6 testes verdes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/safe-next.ts src/lib/auth/safe-next.test.ts
git commit -m "feat(auth): safeNext sanitiza ?next= contra open-redirect"
```

---

### Task 10: Zod schemas (cadastro, login, recuperar, redefinir, meus-dados)

**Files:**
- Create: `src/lib/auth/schemas.ts`

- [ ] **Step 1: Criar `src/lib/auth/schemas.ts`**

```ts
import { z } from 'zod';

const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR',
  'PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
] as const;

const TELEFONE_E164_BR = /^\+55[1-9][1-9]\d{8,9}$/;
const ESTADOS_CIVIS = ['solteiro','casado','uniao_estavel','divorciado','viuvo'] as const;
const REGIMES = ['clt','pj','autonomo','servidor_publico','empresario','aposentado','outro'] as const;

const dezoitoAnosAtras = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
};

export const camposPessoaisSchema = z.object({
  nome_completo: z.string().min(3, 'Mínimo 3 caracteres').max(200),
  data_nascimento: z.coerce.date().refine(
    (d) => d <= dezoitoAnosAtras(),
    'Cadastro disponível apenas para maiores de 18 anos',
  ).refine(
    (d) => d >= new Date('1900-01-02'),
    'Data muito antiga',
  ),
  estado_civil: z.enum(ESTADOS_CIVIS),
  dependentes: z.array(z.number().int().min(0).max(120)).max(10, 'Máximo 10 dependentes'),
  profissao: z.string().min(2).max(100),
  regime_trabalho: z.enum(REGIMES),
  cidade: z.string().min(2).max(100),
  uf: z.enum(UFS),
  telefone: z.string().regex(TELEFONE_E164_BR, 'Formato inválido (esperado +55DDXXXXXXXXX)'),
});

export const cadastroSchema = camposPessoaisSchema.extend({
  email: z.string().email('Email inválido'),
  senha: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmar_senha: z.string(),
  aceito_privacidade: z.literal(true, {
    errorMap: () => ({ message: 'É necessário aceitar a Política de Privacidade' }),
  }),
  aceito_transferencia_internacional: z.literal(true, {
    errorMap: () => ({ message: 'É necessário aceitar a transferência internacional dos dados' }),
  }),
  website: z.string().max(0).optional(), // honeypot
}).refine((data) => data.senha === data.confirmar_senha, {
  message: 'As senhas não conferem',
  path: ['confirmar_senha'],
});

export const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1, 'Informe a senha'),
});

export const recuperarSenhaSchema = z.object({
  email: z.string().email(),
});

export const redefinirSenhaSchema = z.object({
  senha: z.string().min(8),
  confirmar_senha: z.string(),
}).refine((data) => data.senha === data.confirmar_senha, {
  message: 'As senhas não conferem',
  path: ['confirmar_senha'],
});

export const meusDadosSchema = camposPessoaisSchema;

export type CadastroForm = z.infer<typeof cadastroSchema>;
export type LoginForm = z.infer<typeof loginSchema>;
export type RecuperarSenhaForm = z.infer<typeof recuperarSenhaSchema>;
export type RedefinirSenhaForm = z.infer<typeof redefinirSenhaSchema>;
export type MeusDadosForm = z.infer<typeof meusDadosSchema>;
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Expected: build limpo.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/schemas.ts
git commit -m "feat(auth): schemas Zod com floor 18 anos + 2 checkboxes de consentimento"
```

---

### Task 11: Mutations de auth (signUp, signIn, etc.)

**Files:**
- Create: `src/lib/auth/mutations.ts`

- [ ] **Step 1: Criar `src/lib/auth/mutations.ts`**

```ts
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
  const { error } = await supabase
    .from('profiles')
    .update({
      nome_completo: form.nome_completo,
      data_nascimento: form.data_nascimento.toISOString().slice(0, 10),
      estado_civil: form.estado_civil,
      dependentes: form.dependentes,
      profissao: form.profissao,
      regime_trabalho: form.regime_trabalho,
      cidade: form.cidade,
      uf: form.uf,
      telefone: form.telefone,
    })
    .eq('id', userId);

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
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Expected: build limpo.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/mutations.ts
git commit -m "feat(auth): mutations (signUp, signIn, signOut, reset, update, deleteOwnAccount)"
```

---

## Fase D — Componentes base

### Task 12: Componentes de estado (Spinner, ErrorBoundary, ConnectionError, OrphanProfile)

**Files:**
- Create: `src/components/FullScreenSpinner.tsx`
- Create: `src/components/ErrorBoundary.tsx`
- Create: `src/components/ConnectionErrorScreen.tsx`
- Create: `src/components/OrphanProfileError.tsx`

- [ ] **Step 1: Criar `FullScreenSpinner.tsx`**

```tsx
export function FullScreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Criar `ErrorBoundary.tsx`**

```tsx
import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('Erro não-tratado:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md text-center">
            <h1 tabIndex={-1} className="text-2xl font-semibold text-gray-900 mb-2">
              Algo deu errado
            </h1>
            <p className="text-gray-600 mb-4">
              Encontramos um problema inesperado. Recarregue a página para tentar novamente.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 3: Criar `ConnectionErrorScreen.tsx`**

```tsx
interface Props { onRetry: () => void }

export function ConnectionErrorScreen({ onRetry }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <h1 tabIndex={-1} className="text-2xl font-semibold text-gray-900 mb-2">
          Erro de conexão
        </h1>
        <p className="text-gray-600 mb-4">
          Não conseguimos carregar seus dados. Verifique sua internet e tente novamente.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Criar `OrphanProfileError.tsx`**

```tsx
import { whatsappUrl } from '../lib/contact/whatsapp';
import { signOut } from '../lib/auth/mutations';

interface Props { email?: string }

export function OrphanProfileError({ email }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <h1 tabIndex={-1} className="text-2xl font-semibold text-gray-900 mb-2">
          Encontramos um problema com seu cadastro
        </h1>
        <p className="text-gray-600 mb-6">
          Por favor, fale comigo no WhatsApp para resolvermos.
        </p>
        <div className="flex flex-col gap-2">
          <a
            href={whatsappUrl('orfao', { email: email || '' })}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Falar no WhatsApp
          </a>
          <button
            type="button"
            onClick={() => { void signOut().then(() => { window.location.href = '/'; }); }}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verificar build**

```bash
npm run build
```

Expected: build limpo.

- [ ] **Step 6: Commit**

```bash
git add src/components/FullScreenSpinner.tsx src/components/ErrorBoundary.tsx \
        src/components/ConnectionErrorScreen.tsx src/components/OrphanProfileError.tsx
git commit -m "feat(ui): componentes de estado (spinner, errorboundary, connectionerror, orphan)"
```

---

### Task 13: `ConfirmDialog` (modal Tailwind via @headlessui)

**Files:**
- Create: `src/components/ConfirmDialog.tsx`

- [ ] **Step 1: Criar `src/components/ConfirmDialog.tsx`**

```tsx
import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react';
import { useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Para destrutivos, default false: clicar no overlay NÃO fecha. */
  dismissOnOverlay?: boolean;
  /** Conteúdo extra (ex: input "digite EXCLUIR"). */
  children?: ReactNode;
  /** Desabilita o botão de confirmar (controlado pelo pai). */
  confirmDisabled?: boolean;
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, description,
  confirmLabel, cancelLabel = 'Cancelar',
  destructive = false, dismissOnOverlay,
  children, confirmDisabled = false,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const allowOverlayDismiss = dismissOnOverlay ?? !destructive;

  return (
    <Dialog
      open={open}
      onClose={allowOverlayDismiss ? onClose : () => {}}
      initialFocus={cancelRef}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <DialogTitle className="text-xl font-semibold text-gray-900">{title}</DialogTitle>
          <Description as="div" className="mt-2 text-gray-600">{description}</Description>
          {children && <div className="mt-4">{children}</div>}
          <div className="mt-6 flex justify-end gap-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled}
              className={`px-4 py-2 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Expected: build limpo.

- [ ] **Step 3: Commit**

```bash
git add src/components/ConfirmDialog.tsx
git commit -m "feat(ui): ConfirmDialog acessível via headlessui (foco trap, ESC, restore-focus)"
```

---

### Task 14: Footer + Layouts (Public, Auth)

**Files:**
- Create: `src/components/Footer.tsx`
- Create: `src/components/AuthLayout.tsx`
- Modify: `src/components/Layout.tsx` (renomear para `PublicLayout.tsx` ou refatorar)

- [ ] **Step 1: Verificar conteúdo atual de Layout.tsx**

```bash
cat src/components/Layout.tsx
```

Anotar o que ele faz para preservar comportamento das rotas públicas existentes.

- [ ] **Step 2: Criar `src/components/Footer.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { whatsappUrl } from '../lib/contact/whatsapp';

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-6 px-4 mt-auto">
      <div className="max-w-6xl mx-auto text-center text-sm text-gray-600 space-y-1">
        <p>© 2026 Seu Mapa Financeiro · Caio Gurgel Guerra, CFP®</p>
        <p>Reg. Planejar nº &lt;NUMERO_PLANEJAR&gt;</p>
        <p>
          <Link to="/privacidade" className="hover:text-gray-900">Política de Privacidade</Link>
          {' · '}
          <Link to="/termos" className="hover:text-gray-900">Termos de Uso</Link>
          {' · '}
          <a href={whatsappUrl('duvida_geral')} target="_blank" rel="noreferrer" className="hover:text-gray-900">
            WhatsApp
          </a>
        </p>
      </div>
    </footer>
  );
}
```

(Substituir `<NUMERO_PLANEJAR>` quando bloqueador externo A.1 for resolvido.)

- [ ] **Step 3: Renomear `Layout.tsx` para `PublicLayout.tsx` e adicionar Footer**

```bash
git mv src/components/Layout.tsx src/components/PublicLayout.tsx
```

Editar `src/components/PublicLayout.tsx` adicionando `<Footer />` no final do JSX (manter header existente). Estrutura conceitual:

```tsx
import { Outlet } from 'react-router-dom';
import { Footer } from './Footer';
// ... imports existentes do header atual ...

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* manter header existente daqui */}
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
```

(Adaptar nomes de export e imports para casarem com o que a `Layout.tsx` original já exportava — verificar consumidores em `App.tsx`.)

- [ ] **Step 4: Atualizar imports em `App.tsx` e `main.tsx`**

```bash
grep -rn "from.*Layout" src/ | grep -v "node_modules"
```

Substituir cada `Layout` por `PublicLayout` nos imports.

- [ ] **Step 5: Criar `src/components/AuthLayout.tsx`**

```tsx
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { signOut } from '../lib/auth/mutations';
import { useProfile } from '../hooks/auth/useProfile';
import { Footer } from './Footer';

export function AuthLayout() {
  const navigate = useNavigate();
  const profile = useProfile();
  const email = profile.status === 'ready' ? profile.profile.nome_completo : '';

  async function handleLogout() {
    await signOut();
    toast.info('Você foi desconectado de todos os dispositivos.');
    navigate('/');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-to-r from-blue-900 to-indigo-700 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-white font-semibold text-lg">Seu Mapa Financeiro</Link>
          <div className="flex items-center gap-4 text-white text-sm">
            {email && <span>{email}</span>}
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sair da conta"
              className="hover:underline"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-gray-50">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 6: Verificar build + dev**

```bash
npm run build && npm run dev
```

Abrir http://localhost:5173/ — confirmar que home/calculadoras intactas exibem footer novo no rodapé.

- [ ] **Step 7: Commit**

```bash
git add src/components/
git commit -m "feat(ui): layouts (Public/Auth) + Footer compartilhado"
```

---

### Task 15: Guards (RequireAuth, RequireGuest, RequireClient, RequireAdmin)

**Files:**
- Create: `src/components/RequireAuth.tsx`
- Create: `src/components/RequireGuest.tsx`
- Create: `src/components/RequireClient.tsx`
- Create: `src/components/RequireAdmin.tsx`

- [ ] **Step 1: Criar `RequireAuth.tsx`**

```tsx
import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/auth/useAuth';
import { FullScreenSpinner } from './FullScreenSpinner';

export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === 'loading') return <FullScreenSpinner />;
  if (auth.status === 'unauthenticated') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <>{children}</>;
}
```

- [ ] **Step 2: Criar `RequireGuest.tsx`**

```tsx
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

  if (auth.status === 'loading' || (auth.status === 'authenticated' && profile.status === 'loading')) {
    return <FullScreenSpinner />;
  }
  if (auth.status === 'authenticated') {
    return <Navigate to={smartRedirect(profile)} replace />;
  }
  return <>{children}</>;
}
```

- [ ] **Step 3: Criar `RequireClient.tsx`**

```tsx
import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useProfile } from '../hooks/auth/useProfile';
import { FullScreenSpinner } from './FullScreenSpinner';
import { ConnectionErrorScreen } from './ConnectionErrorScreen';
import { OrphanProfileError } from './OrphanProfileError';

export function RequireClient({ children }: { children: ReactNode }) {
  const profile = useProfile();
  const location = useLocation();

  if (profile.status === 'idle' || profile.status === 'loading') return <FullScreenSpinner />;
  if (profile.status === 'error') return <ConnectionErrorScreen onRetry={profile.refetch} />;
  if (profile.status === 'orphan') return <OrphanProfileError />;
  if (profile.profile.is_admin) return <Navigate to="/admin" replace />;

  const status = profile.profile.status;
  const path = location.pathname;
  if (path === '/aguardando' && !(status === 'lead' || status === 'rejeitado')) {
    return <Navigate to="/liberado" replace />;
  }
  if (path === '/liberado' && (status === 'lead' || status === 'rejeitado')) {
    return <Navigate to="/aguardando" replace />;
  }
  return <>{children}</>;
}
```

- [ ] **Step 4: Criar `RequireAdmin.tsx`**

```tsx
import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useProfile } from '../hooks/auth/useProfile';
import { FullScreenSpinner } from './FullScreenSpinner';
import { ConnectionErrorScreen } from './ConnectionErrorScreen';
import { OrphanProfileError } from './OrphanProfileError';
import { smartRedirect } from './RequireGuest';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const profile = useProfile();

  if (profile.status === 'idle' || profile.status === 'loading') return <FullScreenSpinner />;
  if (profile.status === 'error') return <ConnectionErrorScreen onRetry={profile.refetch} />;
  if (profile.status === 'orphan') return <OrphanProfileError />;
  if (!profile.profile.is_admin) return <Navigate to={smartRedirect(profile)} replace />;
  return <>{children}</>;
}
```

- [ ] **Step 5: Verificar build**

```bash
npm run build
```

Expected: build limpo.

- [ ] **Step 6: Commit**

```bash
git add src/components/Require*.tsx
git commit -m "feat(auth): guards (RequireAuth, RequireGuest, RequireClient, RequireAdmin)"
```

---

## Fase E — Form components

### Task 16: FormField + UFSelect

**Files:**
- Create: `src/components/forms/FormField.tsx`
- Create: `src/components/forms/UFSelect.tsx`

- [ ] **Step 1: Criar `src/components/forms/FormField.tsx`**

```tsx
import { useId, useState, type ReactNode } from 'react';

interface Props {
  label: string;
  tooltip?: string;
  error?: string;
  children: (ids: { inputId: string; errorId: string }) => ReactNode;
  /** Texto curto para screen readers (sr-only) — substitui hover do tooltip em touch. */
  srHint?: string;
}

export function FormField({ label, tooltip, error, children, srHint }: Props) {
  const inputId = useId();
  const errorId = useId();
  const tooltipId = useId();
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1 mb-1">
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">{label}</label>
        {tooltip && (
          <>
            <button
              type="button"
              aria-expanded={tooltipOpen}
              aria-controls={tooltipId}
              onClick={() => setTooltipOpen((v) => !v)}
              onBlur={() => setTooltipOpen(false)}
              className="text-xs text-blue-600 underline-offset-2 hover:underline"
            >
              (?)
            </button>
            {srHint && <span className="sr-only">{srHint}</span>}
          </>
        )}
      </div>
      {tooltip && tooltipOpen && (
        <div id={tooltipId} role="tooltip" className="text-xs text-gray-600 mb-1 p-2 bg-blue-50 rounded">
          {tooltip}
        </div>
      )}
      {children({ inputId, errorId })}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Criar `src/components/forms/UFSelect.tsx`**

```tsx
import { forwardRef, type SelectHTMLAttributes } from 'react';

const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR',
  'PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

export const UFSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function UFSelect(props, ref) {
    return (
      <select
        ref={ref}
        {...props}
        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
      >
        <option value="">UF</option>
        {UFS.map((uf) => (
          <option key={uf} value={uf}>{uf}</option>
        ))}
      </select>
    );
  },
);
```

- [ ] **Step 3: Commit**

```bash
git add src/components/forms/FormField.tsx src/components/forms/UFSelect.tsx
git commit -m "feat(forms): FormField com tooltip touch + UFSelect 27 estados"
```

---

### Task 17: PhoneInput (parser tolerante) — TDD

**Files:**
- Create: `src/components/forms/PhoneInput.tsx`
- Create: `src/components/forms/phone-parser.ts`
- Create: `src/components/forms/phone-parser.test.ts`

- [ ] **Step 1: Criar teste falho `phone-parser.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { normalizePhoneToE164 } from './phone-parser';

describe('normalizePhoneToE164', () => {
  it('aceita E.164 puro', () => {
    expect(normalizePhoneToE164('+5511987654321')).toBe('+5511987654321');
  });

  it('aceita formato com máscara', () => {
    expect(normalizePhoneToE164('+55 (11) 98765-4321')).toBe('+5511987654321');
  });

  it('aceita só DDD + número', () => {
    expect(normalizePhoneToE164('11 98765-4321')).toBe('+5511987654321');
    expect(normalizePhoneToE164('11987654321')).toBe('+5511987654321');
  });

  it('aceita formato com parênteses sem DDI', () => {
    expect(normalizePhoneToE164('(11) 98765-4321')).toBe('+5511987654321');
  });

  it('aceita números fixos de 10 dígitos (8 após DDD)', () => {
    expect(normalizePhoneToE164('1133334444')).toBe('+551133334444');
  });

  it('retorna null para input inválido', () => {
    expect(normalizePhoneToE164('abc')).toBeNull();
    expect(normalizePhoneToE164('123')).toBeNull();
    expect(normalizePhoneToE164('')).toBeNull();
  });

  it('rejeita DDD com zero (00, 09)', () => {
    expect(normalizePhoneToE164('00987654321')).toBeNull();
    expect(normalizePhoneToE164('09987654321')).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar teste — confirmar falha**

```bash
npm test -- phone-parser
```

Expected: FAIL com módulo não encontrado.

- [ ] **Step 3: Implementar `phone-parser.ts`**

```ts
const E164_BR = /^\+55[1-9][1-9]\d{8,9}$/;

export function normalizePhoneToE164(input: string): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, '');
  let normalized: string;

  if (digits.length === 10 || digits.length === 11) {
    normalized = `+55${digits}`;
  } else if (digits.length === 12 || digits.length === 13) {
    if (!digits.startsWith('55')) return null;
    normalized = `+${digits}`;
  } else {
    return null;
  }
  return E164_BR.test(normalized) ? normalized : null;
}
```

- [ ] **Step 4: Rodar teste — confirmar passa**

```bash
npm test -- phone-parser
```

Expected: PASS (7 testes).

- [ ] **Step 5: Implementar `PhoneInput.tsx`**

```tsx
import { forwardRef, type InputHTMLAttributes } from 'react';

export const PhoneInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function PhoneInput(props, ref) {
    return (
      <input
        ref={ref}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+55 (11) 98765-4321"
        {...props}
        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
      />
    );
  },
);
```

(O parser `normalizePhoneToE164` é chamado no `onSubmit` do form de cadastro/meus-dados, antes do Zod — Task 22 mostra integração.)

- [ ] **Step 6: Commit**

```bash
git add src/components/forms/PhoneInput.tsx src/components/forms/phone-parser.ts \
        src/components/forms/phone-parser.test.ts
git commit -m "feat(forms): PhoneInput + parser E.164 tolerante (4 formatos)"
```

---

### Task 18: DependentesInput

**Files:**
- Create: `src/components/forms/DependentesInput.tsx`

- [ ] **Step 1: Criar `src/components/forms/DependentesInput.tsx`**

```tsx
import { whatsappUrl } from '../../lib/contact/whatsapp';

interface Props {
  value: number[];
  onChange: (next: number[]) => void;
}

const MAX = 10;

export function DependentesInput({ value, onChange }: Props) {
  const atLimit = value.length >= MAX;

  function add() {
    if (atLimit) return;
    onChange([...value, 0]);
  }

  function update(idx: number, idade: number) {
    const next = [...value];
    next[idx] = idade;
    onChange(next);
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      {value.map((idade, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <label className="text-sm text-gray-700 w-28">Dependente {idx + 1} — idade</label>
          <input
            type="number"
            min={0}
            max={120}
            value={idade}
            onChange={(e) => update(idx, parseInt(e.target.value || '0', 10))}
            className="border border-gray-300 rounded-lg px-3 py-1 w-20 focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => remove(idx)}
            className="text-red-600 text-sm hover:underline"
          >
            Remover
          </button>
        </div>
      ))}
      {!atLimit ? (
        <button
          type="button"
          onClick={add}
          className="text-blue-600 text-sm hover:underline"
        >
          + Adicionar dependente
        </button>
      ) : (
        <p className="text-sm text-gray-500">
          Limite de 10 dependentes nesta etapa. Para mais,{' '}
          <a
            href={whatsappUrl('duvida_geral')}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            fale comigo no WhatsApp
          </a>.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Expected: build limpo.

- [ ] **Step 3: Commit**

```bash
git add src/components/forms/DependentesInput.tsx
git commit -m "feat(forms): DependentesInput max=10 com link WhatsApp ao limite"
```

---

## Fase F — Pages auth

### Task 19: CadastroPage (com draft TTL + 2 checkboxes + honeypot)

**Files:**
- Create: `src/pages/auth/CadastroPage.tsx`

- [ ] **Step 1: Criar `src/pages/auth/CadastroPage.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { cadastroSchema, type CadastroForm } from '../../lib/auth/schemas';
import { signUp } from '../../lib/auth/mutations';
import { normalizePhoneToE164 } from '../../components/forms/phone-parser';
import { FormField } from '../../components/forms/FormField';
import { UFSelect } from '../../components/forms/UFSelect';
import { PhoneInput } from '../../components/forms/PhoneInput';
import { DependentesInput } from '../../components/forms/DependentesInput';

const DRAFT_KEY = 'cadastro_draft_v1';
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

interface Draft {
  data: Partial<CadastroForm>;
  savedAt: number;
}

function loadDraft(): Partial<CadastroForm> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed: Draft = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function saveDraft(data: Partial<CadastroForm>) {
  // NUNCA persistir senha, confirmar_senha, aceito_privacidade, aceito_transferencia_internacional
  const { senha, confirmar_senha, aceito_privacidade, aceito_transferencia_internacional, website, ...safe } = data;
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ data: safe, savedAt: Date.now() } satisfies Draft));
}

export function CadastroPage() {
  const navigate = useNavigate();
  const draftSavedRef = useRef<number>(0);
  const h1Ref = useRef<HTMLHeadingElement>(null);

  const draft = loadDraft();
  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } = useForm<CadastroForm>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: { dependentes: [], ...draft } as Partial<CadastroForm>,
  });

  // Auto-focus no h1
  useEffect(() => { h1Ref.current?.focus(); }, []);

  // Auto-save draft (debounce 500ms)
  const watched = watch();
  useEffect(() => {
    const t = setTimeout(() => saveDraft(watched), 500);
    return () => clearTimeout(t);
  }, [watched]);

  async function onSubmit(form: CadastroForm) {
    // Normaliza telefone antes
    const tel = normalizePhoneToE164(form.telefone);
    if (!tel) {
      toast.error('Telefone inválido. Use formato +55DDXXXXXXXXX.');
      return;
    }
    const result = await signUp({ ...form, telefone: tel });
    if (result.ok) {
      localStorage.removeItem(DRAFT_KEY);
      navigate(`/confirme-email?email=${encodeURIComponent(form.email)}`);
      return;
    }
    if (result.reason === 'duplicate') {
      toast.error('Este email já está cadastrado. Faça login ou recupere sua senha.');
      return;
    }
    if (result.reason === 'honeypot') {
      window.location.href = '/'; // rejeição silenciosa
      return;
    }
    toast.error('Erro ao cadastrar. Tente novamente em instantes.');
  }

  // Visible field count for "Etapa X de N"
  const totalFields = 12;

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 ref={h1Ref} tabIndex={-1} className="text-2xl font-semibold mb-6">
        Cadastro — Consultoria CFP
      </h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-1">
        {/* Honeypot off-screen */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
          {...register('website')}
        />

        <FormField label="Nome completo" tooltip="Como aparece no seu RG/CNH" error={errors.nome_completo?.message}>
          {({ inputId, errorId }) => (
            <input id={inputId} aria-describedby={errors.nome_completo ? errorId : undefined}
                   {...register('nome_completo')}
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500" />
          )}
        </FormField>

        <FormField label="Data de nascimento"
                   tooltip="Cadastro disponível para maiores de 18 anos."
                   error={errors.data_nascimento?.message}>
          {({ inputId, errorId }) => (
            <input id={inputId} type="date"
                   aria-describedby={errors.data_nascimento ? errorId : undefined}
                   {...register('data_nascimento')}
                   className="border border-gray-300 rounded-lg px-3 py-2" />
          )}
        </FormField>

        <FormField label="Estado civil" tooltip="Influencia proteção patrimonial" error={errors.estado_civil?.message}>
          {({ inputId }) => (
            <select id={inputId} {...register('estado_civil')}
                    className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="">Selecione</option>
              <option value="solteiro">Solteiro(a)</option>
              <option value="casado">Casado(a)</option>
              <option value="uniao_estavel">União estável</option>
              <option value="divorciado">Divorciado(a)</option>
              <option value="viuvo">Viúvo(a)</option>
            </select>
          )}
        </FormField>

        <FormField label="Dependentes (idades)"
                   tooltip="Adicione filhos ou outros dependentes financeiros"
                   error={errors.dependentes?.message}>
          {() => (
            <Controller name="dependentes" control={control}
                        render={({ field }) => (
                          <DependentesInput value={field.value || []} onChange={field.onChange} />
                        )} />
          )}
        </FormField>

        <FormField label="Profissão" tooltip="Sua atividade principal" error={errors.profissao?.message}>
          {({ inputId }) => (
            <input id={inputId} {...register('profissao')}
                   className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          )}
        </FormField>

        <FormField label="Regime de trabalho" error={errors.regime_trabalho?.message}>
          {({ inputId }) => (
            <select id={inputId} {...register('regime_trabalho')}
                    className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="">Selecione</option>
              <option value="clt">CLT</option>
              <option value="pj">PJ</option>
              <option value="autonomo">Autônomo</option>
              <option value="servidor_publico">Servidor público</option>
              <option value="empresario">Empresário</option>
              <option value="aposentado">Aposentado</option>
              <option value="outro">Outro</option>
            </select>
          )}
        </FormField>

        <div className="flex gap-2">
          <FormField label="Cidade" tooltip="Influencia custo de vida" error={errors.cidade?.message}>
            {({ inputId }) => (
              <input id={inputId} {...register('cidade')}
                     className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            )}
          </FormField>
          <FormField label="UF" error={errors.uf?.message}>
            {({ inputId }) => <UFSelect id={inputId} {...register('uf')} />}
          </FormField>
        </div>

        <FormField label="Telefone" tooltip="Apenas números brasileiros" error={errors.telefone?.message}>
          {({ inputId }) => (
            <PhoneInput id={inputId} {...register('telefone')}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          )}
        </FormField>

        <FormField label="Email" tooltip="Será seu login. Cuidado com typos." error={errors.email?.message}>
          {({ inputId }) => (
            <input id={inputId} type="email" autoComplete="email" {...register('email')}
                   className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          )}
        </FormField>

        <FormField label="Senha" tooltip="Mínimo 8 caracteres" error={errors.senha?.message}>
          {({ inputId }) => (
            <input id={inputId} type="password" autoComplete="new-password" {...register('senha')}
                   className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          )}
        </FormField>

        <FormField label="Confirmar senha" error={errors.confirmar_senha?.message}>
          {({ inputId }) => (
            <input id={inputId} type="password" autoComplete="new-password" {...register('confirmar_senha')}
                   className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          )}
        </FormField>

        <label className="flex items-start gap-2 mt-4">
          <input type="checkbox" {...register('aceito_privacidade')} />
          <span className="text-sm text-gray-700">
            Aceito a{' '}
            <Link to="/privacidade" target="_blank" className="text-blue-600 underline">
              Política de Privacidade
            </Link>
          </span>
        </label>
        {errors.aceito_privacidade && (
          <p className="text-xs text-red-600">{errors.aceito_privacidade.message}</p>
        )}

        <label className="flex items-start gap-2">
          <input type="checkbox" {...register('aceito_transferencia_internacional')} />
          <span className="text-sm text-gray-700">
            Concordo com a transferência dos meus dados para Estados Unidos (Supabase, Resend),
            conforme item 4 da Política de Privacidade.
          </span>
        </label>
        {errors.aceito_transferencia_internacional && (
          <p className="text-xs text-red-600">{errors.aceito_transferencia_internacional.message}</p>
        )}

        <button type="submit" disabled={isSubmitting}
                className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting ? 'Cadastrando...' : 'Criar conta'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Expected: build limpo.

- [ ] **Step 3: Commit**

```bash
git add src/pages/auth/CadastroPage.tsx
git commit -m "feat(pages): CadastroPage com draft TTL, 2 checkboxes LGPD, honeypot off-screen"
```

---

### Task 20: LoginPage + ConfirmeEmailPage

**Files:**
- Create: `src/pages/auth/LoginPage.tsx`
- Create: `src/pages/auth/ConfirmeEmailPage.tsx`

- [ ] **Step 1: Criar `LoginPage.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { loginSchema, type LoginForm } from '../../lib/auth/schemas';
import { signIn, resendConfirmation } from '../../lib/auth/mutations';
import { safeNext } from '../../lib/auth/safe-next';
import { useProfile } from '../../hooks/auth/useProfile';
import { smartRedirect } from '../../components/RequireGuest';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const profile = useProfile();
  const h1Ref = useRef<HTMLHeadingElement>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting }, getValues } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => { h1Ref.current?.focus(); }, []);

  async function onSubmit(form: LoginForm) {
    const result = await signIn(form.email, form.senha);
    if (!result.ok) {
      const msg = result.error.message.toLowerCase();
      if (msg.includes('email not confirmed') || msg.includes('confirm')) {
        toast.error('Confirme seu email antes de fazer login.', {
          action: {
            label: 'Reenviar email',
            onClick: async () => {
              const r = await resendConfirmation(form.email);
              toast[r.ok ? 'success' : 'error'](r.ok ? 'Email reenviado.' : 'Falha ao reenviar.');
            },
          },
        });
      } else {
        toast.error('Email ou senha incorretos.');
      }
      return;
    }
    // Aguarda profile resolver e redireciona
    const next = safeNext(searchParams.get('next'));
    const target = profile.status === 'ready' ? smartRedirect(profile) : next;
    navigate(target, { replace: true });
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 ref={h1Ref} tabIndex={-1} className="text-2xl font-semibold mb-6">Entrar</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm text-gray-700">Email</label>
          <input type="email" autoComplete="email" {...register('email')}
                 className="w-full border rounded-lg px-3 py-2" />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label className="text-sm text-gray-700">Senha</label>
          <input type="password" autoComplete="current-password" {...register('senha')}
                 className="w-full border rounded-lg px-3 py-2" />
          {errors.senha && <p className="text-xs text-red-600">{errors.senha.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg disabled:opacity-50">
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link to="/recuperar-senha" className="text-blue-600 hover:underline">Esqueci minha senha</Link>
        <Link to="/cadastro" className="text-blue-600 hover:underline">Criar conta</Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Criar `ConfirmeEmailPage.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { resendConfirmation } from '../../lib/auth/mutations';
import { whatsappUrl } from '../../lib/contact/whatsapp';

const COOLDOWN_S = 60;

export function ConfirmeEmailPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [cooldown, setCooldown] = useState(0);
  const h1Ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => { h1Ref.current?.focus(); }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleResend() {
    const result = await resendConfirmation(email);
    if (result.ok) {
      toast.success('Email reenviado. Verifique sua caixa de entrada.');
      setCooldown(COOLDOWN_S);
      return;
    }
    const status = (result.error as { status?: number }).status;
    if (status === 429) {
      toast.error('Muitos pedidos. Aguarde alguns minutos e tente de novo.');
      setCooldown(COOLDOWN_S);
      return;
    }
    toast.error('Falha ao reenviar email.');
  }

  return (
    <div className="max-w-md mx-auto p-6 text-center">
      <h1 ref={h1Ref} tabIndex={-1} className="text-2xl font-semibold mb-4">Confirme seu email</h1>
      <p className="text-gray-700 mb-2">
        Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele para ativar sua conta.
      </p>
      <p className="text-sm text-gray-600 mb-6">Não recebeu? Verifique a caixa de spam.</p>
      <button
        type="button"
        onClick={handleResend}
        disabled={cooldown > 0}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
      >
        {cooldown > 0 ? `Reenviar em ${cooldown}s...` : 'Reenviar email de confirmação'}
      </button>
      <p className="text-sm text-gray-600 mt-6">
        Errou o email?{' '}
        <a href={whatsappUrl('email_errado')} target="_blank" rel="noreferrer"
           className="text-blue-600 underline">
          Fale comigo no WhatsApp
        </a>{' '}
        que eu corrijo manualmente.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Verificar build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/auth/LoginPage.tsx src/pages/auth/ConfirmeEmailPage.tsx
git commit -m "feat(pages): LoginPage com next= seguro + ConfirmeEmailPage estática com cooldown"
```

---

### Task 21: RecuperarSenhaPage + RedefinirSenhaPage

**Files:**
- Create: `src/pages/auth/RecuperarSenhaPage.tsx`
- Create: `src/pages/auth/RedefinirSenhaPage.tsx`

- [ ] **Step 1: Criar `RecuperarSenhaPage.tsx`**

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { recuperarSenhaSchema, type RecuperarSenhaForm } from '../../lib/auth/schemas';
import { requestPasswordReset } from '../../lib/auth/mutations';

export function RecuperarSenhaPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RecuperarSenhaForm>({
    resolver: zodResolver(recuperarSenhaSchema),
  });

  async function onSubmit(form: RecuperarSenhaForm) {
    const result = await requestPasswordReset(form.email);
    if (result.ok) {
      setSent(true);
      return;
    }
    toast.error('Falha ao enviar email. Tente novamente.');
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <h1 className="text-2xl font-semibold mb-4">Email enviado</h1>
        <p>Se o email estiver cadastrado, você receberá um link para redefinir a senha em instantes.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Recuperar senha</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm text-gray-700">Email cadastrado</label>
          <input type="email" autoComplete="email" {...register('email')}
                 className="w-full border rounded-lg px-3 py-2" />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg disabled:opacity-50">
          {isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Criar `RedefinirSenhaPage.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { redefinirSenhaSchema, type RedefinirSenhaForm } from '../../lib/auth/schemas';
import { updatePassword } from '../../lib/auth/mutations';
import { supabase } from '../../lib/supabase/client';

export function RedefinirSenhaPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Limpa sessão local pré-existente para evitar estado misto
    void supabase.auth.signOut({ scope: 'local' });

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    const t = setTimeout(() => {
      if (!ready) setError('Link inválido ou expirado.');
    }, 8000);
    return () => { data.subscription.unsubscribe(); clearTimeout(t); };
  }, [ready]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RedefinirSenhaForm>({
    resolver: zodResolver(redefinirSenhaSchema),
  });

  async function onSubmit(form: RedefinirSenhaForm) {
    const result = await updatePassword(form);
    if (result.ok) {
      toast.success('Senha alterada. Faça login com a nova senha.');
      navigate('/login', { replace: true });
      return;
    }
    toast.error('Falha ao alterar senha.');
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <h1 className="text-2xl font-semibold mb-4">{error}</h1>
        <a href="/recuperar-senha" className="text-blue-600 underline">Solicitar novo link</a>
      </div>
    );
  }

  if (!ready) {
    return <div className="max-w-md mx-auto p-6 text-center">Validando link...</div>;
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Nova senha</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm text-gray-700">Nova senha</label>
          <input type="password" autoComplete="new-password" {...register('senha')}
                 className="w-full border rounded-lg px-3 py-2" />
          {errors.senha && <p className="text-xs text-red-600">{errors.senha.message}</p>}
        </div>
        <div>
          <label className="text-sm text-gray-700">Confirmar senha</label>
          <input type="password" autoComplete="new-password" {...register('confirmar_senha')}
                 className="w-full border rounded-lg px-3 py-2" />
          {errors.confirmar_senha && <p className="text-xs text-red-600">{errors.confirmar_senha.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg disabled:opacity-50">
          {isSubmitting ? 'Salvando...' : 'Definir nova senha'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/auth/RecuperarSenhaPage.tsx src/pages/auth/RedefinirSenhaPage.tsx
git commit -m "feat(pages): RecuperarSenhaPage + RedefinirSenhaPage com PASSWORD_RECOVERY 8s"
```

---

### Task 22: PrivacidadePage + TermosPage + ContaExcluidaPage

**Files:**
- Create: `src/pages/auth/PrivacidadePage.tsx`
- Create: `src/pages/auth/TermosPage.tsx`
- Create: `src/pages/cliente/ContaExcluidaPage.tsx`

- [ ] **Step 1: Criar `PrivacidadePage.tsx`**

Estrutura conceitual (texto literal vem do spec §3.10 — copiar item por item):

```tsx
import { POLICY_LAST_UPDATED } from '../../lib/legal/version';

export function PrivacidadePage() {
  return (
    <article className="max-w-3xl mx-auto p-6 prose prose-sm">
      <h1 className="text-2xl font-semibold">Política de Privacidade — Seu Mapa Financeiro</h1>
      <p><em>Versão 1 — Última atualização: {POLICY_LAST_UPDATED}</em></p>

      <h2>1. Controlador</h2>
      {/* TEXTO DO SPEC §3.10 ITEM 1 */}

      <h2>2. Quais dados coletamos e por quê</h2>
      {/* Tabela <md:table> + <md:hidden dl empilhado>. Conteúdo literal do spec §3.10 item 2 */}

      <h2>3. Cadastro restrito a maiores de 18 anos</h2>
      {/* §3.10 ITEM 3 */}

      <h2>4. Operadores e transferência internacional</h2>
      {/* §3.10 ITEM 4 (com Art. 33 V principal + checkbox separado mencionado) */}

      <h2>5. Armazenamento</h2>
      {/* §3.10 ITEM 5 */}

      <h2>6. Seus direitos (LGPD Art. 18)</h2>
      {/* §3.10 ITEM 6 */}

      <h2>7. Retenção</h2>
      {/* §3.10 ITEM 7 atualizado (sem Lei 10.406) */}

      <h2>8. Incidentes de segurança</h2>
      {/* §3.10 ITEM 8 */}

      <h2>9. Sucessão</h2>
      {/* §3.10 ITEM 9 */}

      <h2>10. Versionamento</h2>
      {/* §3.10 ITEM 10 */}

      <h2>11. Limites do serviço</h2>
      {/* §3.10 ITEM 11 com disclaimer CVM 178 */}

      <p><em>Em caso de dúvidas: caio.gurgel.guerra@gmail.com</em></p>
    </article>
  );
}
```

Copiar literalmente o texto da política do spec §3.10. Não inventar redação.

- [ ] **Step 2: Criar `TermosPage.tsx` (placeholder)**

```tsx
import { TERMS_LAST_UPDATED } from '../../lib/legal/version';

export function TermosPage() {
  return (
    <article className="max-w-3xl mx-auto p-6 prose prose-sm">
      <h1 className="text-2xl font-semibold">Termos de Uso — Seu Mapa Financeiro</h1>
      <p><em>Versão 1 — Última atualização: {TERMS_LAST_UPDATED}</em></p>
      <p>
        <strong>Atenção:</strong> esta versão é provisória e está em revisão jurídica. O texto final
        com escopo do serviço, foro, limitação de responsabilidade e disclaimer da CVM 178/2023
        será publicado antes do go-live.
      </p>
      <p>
        Em caso de dúvidas, fale comigo: caio.gurgel.guerra@gmail.com.
      </p>
    </article>
  );
}
```

- [ ] **Step 3: Criar `ContaExcluidaPage.tsx`**

```tsx
import { whatsappUrl } from '../../lib/contact/whatsapp';

export function ContaExcluidaPage() {
  return (
    <div className="max-w-md mx-auto p-6 text-center">
      <h1 tabIndex={-1} className="text-2xl font-semibold mb-4">Sua conta foi excluída.</h1>
      <p className="text-gray-700 mb-2">
        Sua conta e seus dados foram removidos agora. Você receberá email de confirmação
        em até 15 dias úteis (LGPD Art. 18 §6).
      </p>
      <p className="text-sm text-gray-600 mt-6">
        Em caso de dúvida,{' '}
        <a href={whatsappUrl('conta_excluida')} target="_blank" rel="noreferrer"
           className="text-blue-600 underline">
          fale comigo no WhatsApp
        </a>.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/auth/PrivacidadePage.tsx src/pages/auth/TermosPage.tsx \
        src/pages/cliente/ContaExcluidaPage.tsx
git commit -m "feat(pages): /privacidade (LGPD), /termos (placeholder), /conta-excluida"
```

---

## Fase G — Pages cliente

### Task 23: AguardandoPage + LiberadoPage

**Files:**
- Create: `src/pages/cliente/AguardandoPage.tsx`
- Create: `src/pages/cliente/LiberadoPage.tsx`

- [ ] **Step 1: Criar `AguardandoPage.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { useProfile } from '../../hooks/auth/useProfile';
import { whatsappUrl } from '../../lib/contact/whatsapp';

export function AguardandoPage() {
  const profile = useProfile();
  if (profile.status !== 'ready') return null;

  const createdAt = new Date(profile.profile.created_at);
  const days = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const showWarning = days > 3;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Você está na fila!</h1>
      <p className="mb-4">
        Recebemos seu cadastro. Para garantir um atendimento de qualidade, eu (Caio Gurgel,
        planejador certificado pelo CFP) reviso pessoalmente cada cliente antes de liberar
        o onboarding.
      </p>
      <p className="mb-4">
        Vou revisar nos próximos dias úteis e te aviso por email quando o acesso estiver liberado.
      </p>
      <p className="mb-6">
        Se tiver dúvidas, fale comigo no{' '}
        <a href={whatsappUrl('aguardando', { nome: profile.profile.nome_completo })}
           target="_blank" rel="noreferrer" className="text-blue-600 underline">
          WhatsApp
        </a>.
      </p>
      {showWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          ⚠ Faz mais tempo do que o esperado. Por favor,{' '}
          <a href={whatsappUrl('aguardando', { nome: profile.profile.nome_completo })}
             target="_blank" rel="noreferrer" className="text-blue-700 underline">
            fale comigo no WhatsApp
          </a>{' '}para conferirmos.
        </div>
      )}
      <Link to="/meus-dados" className="text-blue-600 underline">Corrigir meus dados</Link>
    </div>
  );
}
```

- [ ] **Step 2: Criar `LiberadoPage.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { useProfile } from '../../hooks/auth/useProfile';
import { whatsappUrl } from '../../lib/contact/whatsapp';

export function LiberadoPage() {
  const profile = useProfile();
  if (profile.status !== 'ready') return null;
  const dataLib = new Date(profile.profile.updated_at).toLocaleDateString('pt-BR');

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Acesso liberado em {dataLib}!</h1>
      <p className="mb-4">
        Em breve você poderá preencher os dados do seu planejamento aqui.
      </p>
      <p className="mb-6">
        Vou entrar em contato em breve via WhatsApp ou email para combinarmos os próximos passos.
        Se preferir, me chame:{' '}
        <a href={whatsappUrl('liberado')} target="_blank" rel="noreferrer"
           className="text-blue-600 underline">WhatsApp</a>.
      </p>
      <Link to="/meus-dados" className="text-blue-600 underline">Corrigir meus dados</Link>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/cliente/AguardandoPage.tsx src/pages/cliente/LiberadoPage.tsx
git commit -m "feat(pages): /aguardando com warning 3 dias + /liberado com data"
```

---

### Task 24: MeusDadosPage com Excluir Conta (ConfirmDialog)

**Files:**
- Create: `src/pages/cliente/MeusDadosPage.tsx`

- [ ] **Step 1: Criar `MeusDadosPage.tsx`**

```tsx
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { meusDadosSchema, type MeusDadosForm } from '../../lib/auth/schemas';
import { updateOwnProfile, deleteOwnAccount } from '../../lib/auth/mutations';
import { useProfile } from '../../hooks/auth/useProfile';
import { normalizePhoneToE164 } from '../../components/forms/phone-parser';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormField } from '../../components/forms/FormField';
import { UFSelect } from '../../components/forms/UFSelect';
import { PhoneInput } from '../../components/forms/PhoneInput';
import { DependentesInput } from '../../components/forms/DependentesInput';

export function MeusDadosPage() {
  const navigate = useNavigate();
  const profile = useProfile();
  const [step1Open, setStep1Open] = useState(false);
  const [step2Open, setStep2Open] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  if (profile.status !== 'ready') return null;

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<MeusDadosForm>({
    resolver: zodResolver(meusDadosSchema),
    defaultValues: {
      ...profile.profile,
      data_nascimento: new Date(profile.profile.data_nascimento),
    } as Partial<MeusDadosForm>,
  });

  async function onSubmit(form: MeusDadosForm) {
    const tel = normalizePhoneToE164(form.telefone);
    if (!tel) {
      toast.error('Telefone inválido.');
      return;
    }
    const result = await updateOwnProfile(profile.profile.id, { ...form, telefone: tel });
    if (result.ok) {
      toast.success('Dados atualizados.');
      profile.refetch();
    } else {
      toast.error('Falha ao atualizar.');
    }
  }

  async function handleDelete() {
    setStep2Open(false);
    const r = await deleteOwnAccount();
    if (r.ok) {
      navigate('/conta-excluida', { replace: true });
      return;
    }
    if (r.reason === 'last_admin') {
      toast.error('Não é possível excluir o último admin.');
      return;
    }
    toast.error('Erro ao excluir conta. Tente novamente.');
  }

  const backTo = profile.profile.status === 'lead' || profile.profile.status === 'rejeitado'
    ? '/aguardando' : '/liberado';

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Meus dados</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-1">
        {/* Mesma estrutura de campos da CadastroPage, sem email/senha/aceites */}
        {/* (ver Task 19 — copiar campos de Nome até Telefone) */}
        <FormField label="Nome completo" error={errors.nome_completo?.message}>
          {({ inputId }) => (
            <input id={inputId} {...register('nome_completo')}
                   className="w-full border rounded-lg px-3 py-2" />
          )}
        </FormField>

        {/* ... demais campos: data_nascimento, estado_civil, dependentes, profissao,
              regime_trabalho, cidade, uf, telefone — idêntico à CadastroPage ... */}

        <button type="submit" disabled={isSubmitting}
                className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg disabled:opacity-50">
          Salvar
        </button>
        <Link to={backTo} className="block text-center mt-2 text-blue-600 underline">Voltar</Link>
      </form>

      <hr className="my-8" />
      <button
        type="button"
        onClick={() => setStep1Open(true)}
        className="text-red-600 hover:underline"
      >
        Excluir minha conta
      </button>

      <ConfirmDialog
        open={step1Open}
        onClose={() => setStep1Open(false)}
        onConfirm={() => { setStep1Open(false); setStep2Open(true); setConfirmText(''); }}
        title="Excluir minha conta"
        description={
          <p>
            Esta ação é irreversível. Excluiremos seu cadastro agora. Você receberá email
            de confirmação em até 15 dias úteis (LGPD Art. 18 §6).
          </p>
        }
        confirmLabel="Continuar"
        destructive
      />
      <ConfirmDialog
        open={step2Open}
        onClose={() => setStep2Open(false)}
        onConfirm={handleDelete}
        title="Confirmação final"
        description={<p>Digite <strong>EXCLUIR</strong> para confirmar a exclusão definitiva.</p>}
        confirmLabel="Excluir"
        destructive
        confirmDisabled={confirmText !== 'EXCLUIR'}
      >
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          placeholder="EXCLUIR"
        />
      </ConfirmDialog>
    </div>
  );
}
```

(Os campos `data_nascimento`, `estado_civil`, `dependentes`, `profissao`, `regime_trabalho`, `cidade`, `uf`, `telefone` repetem a estrutura da CadastroPage Task 19. Implementar literalmente cada `<FormField>` correspondente; deixei comentado por brevidade.)

- [ ] **Step 2: Commit**

```bash
git add src/pages/cliente/MeusDadosPage.tsx
git commit -m "feat(pages): /meus-dados com edição + Excluir Conta (ConfirmDialog dupla)"
```

---

## Fase H — Pages admin

### Task 25: lib/admin queries + mutations

**Files:**
- Create: `src/lib/admin/queries.ts`
- Create: `src/lib/admin/mutations.ts`

- [ ] **Step 1: Criar `src/lib/admin/queries.ts`**

```ts
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

/** Detecção de duplicados por (telefone) ou (nome + data_nascimento). */
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
  // Mantém só chaves com 2+ entradas
  return new Map(Array.from(byKey).filter(([_, list]) => list.length > 1));
}
```

- [ ] **Step 2: Criar `src/lib/admin/mutations.ts`**

```ts
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
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/admin/
git commit -m "feat(admin): queries (listClients, findDuplicates) + mutations (release/reject)"
```

---

### Task 26: ListaClientesPage (busca + filtros + cards mobile)

**Files:**
- Create: `src/pages/admin/ListaClientesPage.tsx`

- [ ] **Step 1: Criar `ListaClientesPage.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { listClients, findDuplicates } from '../../lib/admin/queries';
import { releaseClient, rejectClient } from '../../lib/admin/mutations';
import type { ProfileWithEmail, ClientStatus } from '../../lib/supabase/types';

const STATUSES: (ClientStatus | 'todos')[] = [
  'todos','lead','rejeitado','liberado','em_onboarding','submetido','em_consultoria','concluido',
];

export function ListaClientesPage() {
  const [clients, setClients] = useState<ProfileWithEmail[] | null>(null);
  const [filter, setFilter] = useState<'todos' | ClientStatus>('todos');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  async function reload() {
    try {
      setClients(await listClients());
    } catch {
      toast.error('Erro ao carregar lista.');
    }
  }
  useEffect(() => { void reload(); }, []);

  const duplicates = useMemo(
    () => clients ? findDuplicates(clients) : new Map(),
    [clients],
  );

  const filtered = useMemo(() => {
    if (!clients) return [];
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (filter !== 'todos' && c.status !== filter) return false;
      if (!q) return true;
      return c.nome_completo.toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q);
    });
  }, [clients, filter, search]);

  async function handleLiberar(c: ProfileWithEmail) {
    setBusy((b) => ({ ...b, [c.id]: true }));
    const r = await releaseClient(c.id);
    setBusy((b) => ({ ...b, [c.id]: false }));
    if (!r.ok) { toast.error('Falha ao liberar.'); return; }
    if (r.data?.alreadyReleased) {
      toast('Cliente já estava liberado (email pode ter sido enviado anteriormente).');
    } else if (r.data?.emailSent) {
      toast.success('Cliente liberado. Email enviado.');
    } else {
      toast.warning('Cliente liberado, mas o email falhou. Avise por WhatsApp.');
    }
    await reload();
  }

  async function handleRecusar(c: ProfileWithEmail) {
    const motivo = window.prompt(`Recusar ${c.nome_completo}? Motivo (obrigatório):`);
    if (!motivo) return;
    const r = await rejectClient(c.id, motivo);
    toast[r.ok ? 'success' : 'error'](r.ok ? 'Cliente recusado.' : 'Falha ao recusar.');
    await reload();
  }

  if (!clients) return <div className="p-6">Carregando...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Clientes</h1>
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou email"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value as ClientStatus | 'todos')}
                className="border border-gray-300 rounded-lg px-3 py-2">
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Tabela em md+ / Cards em mobile */}
      <div className="hidden md:block">
        <table className="w-full border-collapse">
          <caption className="sr-only">Lista de clientes</caption>
          <thead className="bg-gray-100">
            <tr className="text-left text-sm">
              <th className="p-2">Nome</th><th className="p-2">Email</th>
              <th className="p-2">Status</th><th className="p-2">Cadastrado</th>
              <th className="p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2">
                  {c.nome_completo}
                  {(duplicates.get(`tel:${c.telefone}`) || []).length > 1 && (
                    <span className="ml-2 text-xs bg-orange-100 text-orange-800 rounded px-1">
                      possível duplicado
                    </span>
                  )}
                </td>
                <td className="p-2">{c.email}</td>
                <td className="p-2">{c.status}</td>
                <td className="p-2 text-sm">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="p-2 space-x-2">
                  {c.status === 'lead' && (
                    <>
                      <button disabled={busy[c.id]} onClick={() => handleLiberar(c)}
                              className="text-green-600 hover:underline disabled:opacity-50">
                        Liberar
                      </button>
                      <button onClick={() => handleRecusar(c)}
                              className="text-red-600 hover:underline">
                        Recusar
                      </button>
                    </>
                  )}
                  <Link to={`/admin/cliente/${c.id}`} className="text-blue-600 hover:underline">
                    Detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {filtered.map((c) => (
          <div key={c.id} className="bg-white rounded-lg shadow-sm border p-4">
            <div className="font-semibold">{c.nome_completo}</div>
            <div className="text-sm text-gray-600">{c.email}</div>
            <div className="flex gap-2 mt-2 text-xs">
              <span className="bg-gray-100 px-2 py-1 rounded">{c.status}</span>
              <span className="bg-gray-100 px-2 py-1 rounded">
                {new Date(c.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              {c.status === 'lead' && (
                <>
                  <button disabled={busy[c.id]} onClick={() => handleLiberar(c)}
                          className="text-green-600 text-sm">Liberar</button>
                  <button onClick={() => handleRecusar(c)}
                          className="text-red-600 text-sm">Recusar</button>
                </>
              )}
              <Link to={`/admin/cliente/${c.id}`} className="text-blue-600 text-sm">Detalhes</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/admin/ListaClientesPage.tsx
git commit -m "feat(admin): /admin com busca + filtros + cards mobile + liberar/recusar"
```

---

### Task 27: DetalheClientePage

**Files:**
- Create: `src/pages/admin/DetalheClientePage.tsx`

- [ ] **Step 1: Criar `DetalheClientePage.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getClientById } from '../../lib/admin/queries';
import type { ProfileWithEmail } from '../../lib/supabase/types';

export function DetalheClientePage() {
  const { id } = useParams<{ id: string }>();
  const [c, setC] = useState<ProfileWithEmail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getClientById(id).then((data) => { setC(data); setLoading(false); });
  }, [id]);

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!c) return <div className="p-6">Cliente não encontrado.</div>;

  function calcIdade(dateStr: string): number {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Link to="/admin" className="text-blue-600 underline mb-4 inline-block">← Voltar</Link>
      <h1 className="text-2xl font-semibold mb-6">{c.nome_completo}</h1>

      <section className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <h2 className="font-semibold mb-2">Identificação</h2>
        <p>Email: {c.email}</p>
        <p>Telefone: {c.telefone}</p>
      </section>

      <section className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <h2 className="font-semibold mb-2">Dados pessoais</h2>
        <p>Data nascimento: {new Date(c.data_nascimento).toLocaleDateString('pt-BR')} ({calcIdade(c.data_nascimento)} anos)</p>
        <p>Estado civil: {c.estado_civil}</p>
        <p>Dependentes: {c.dependentes.length === 0 ? 'nenhum' : c.dependentes.join(', ')}</p>
        <p>Profissão: {c.profissao}</p>
        <p>Regime: {c.regime_trabalho}</p>
      </section>

      <section className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <h2 className="font-semibold mb-2">Endereço</h2>
        <p>{c.cidade} / {c.uf}</p>
      </section>

      <section className="bg-white rounded-lg shadow-sm border p-4">
        <h2 className="font-semibold mb-2">Status</h2>
        <p>Status: <strong>{c.status}</strong></p>
        {c.motivo_rejeicao && <p>Motivo: {c.motivo_rejeicao}</p>}
        <p>Cadastrado em: {new Date(c.created_at).toLocaleString('pt-BR')}</p>
        <p>Última atividade: {c.last_sign_in_at ? new Date(c.last_sign_in_at).toLocaleString('pt-BR') : '—'}</p>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/admin/DetalheClientePage.tsx
git commit -m "feat(admin): /admin/cliente/:id com seções de identificação/dados/status"
```

---

## Fase I — App.tsx (rotas)

### Task 28: Modificar App.tsx com BrowserRouter, Routes, Toaster, ErrorBoundary

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Ler conteúdo atual de App.tsx**

```bash
cat src/App.tsx
```

Anotar os imports/rotas existentes (Home, AposentadoriaPage, SalarioPage).

- [ ] **Step 2: Reescrever App.tsx com nova estrutura**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PublicLayout } from './components/PublicLayout';
import { AuthLayout } from './components/AuthLayout';
import { RequireAuth } from './components/RequireAuth';
import { RequireGuest } from './components/RequireGuest';
import { RequireClient } from './components/RequireClient';
import { RequireAdmin } from './components/RequireAdmin';

import { Home } from './pages/Home';
import { AposentadoriaPage } from './pages/AposentadoriaPage';
import { SalarioPage } from './pages/SalarioPage';

import { CadastroPage } from './pages/auth/CadastroPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RecuperarSenhaPage } from './pages/auth/RecuperarSenhaPage';
import { RedefinirSenhaPage } from './pages/auth/RedefinirSenhaPage';
import { ConfirmeEmailPage } from './pages/auth/ConfirmeEmailPage';
import { PrivacidadePage } from './pages/auth/PrivacidadePage';
import { TermosPage } from './pages/auth/TermosPage';
import { ContaExcluidaPage } from './pages/cliente/ContaExcluidaPage';

import { AguardandoPage } from './pages/cliente/AguardandoPage';
import { LiberadoPage } from './pages/cliente/LiberadoPage';
import { MeusDadosPage } from './pages/cliente/MeusDadosPage';

import { ListaClientesPage } from './pages/admin/ListaClientesPage';
import { DetalheClientePage } from './pages/admin/DetalheClientePage';

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          {/* Públicas + Auth (PublicLayout) */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/aposentadoria" element={<AposentadoriaPage />} />
            <Route path="/salario" element={<SalarioPage />} />
            <Route path="/privacidade" element={<PrivacidadePage />} />
            <Route path="/termos" element={<TermosPage />} />
            <Route path="/conta-excluida" element={<ContaExcluidaPage />} />

            {/* Auth — RequireGuest só em /cadastro e /login */}
            <Route path="/cadastro" element={<RequireGuest><CadastroPage /></RequireGuest>} />
            <Route path="/login" element={<RequireGuest><LoginPage /></RequireGuest>} />
            <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
            <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
            <Route path="/confirme-email" element={<ConfirmeEmailPage />} />
          </Route>

          {/* Cliente autenticado */}
          <Route element={<RequireAuth><RequireClient><AuthLayout /></RequireClient></RequireAuth>}>
            <Route path="/aguardando" element={<AguardandoPage />} />
            <Route path="/liberado" element={<LiberadoPage />} />
            <Route path="/meus-dados" element={<MeusDadosPage />} />
          </Route>

          {/* Admin */}
          <Route element={<RequireAuth><RequireAdmin><AuthLayout /></RequireAdmin></RequireAuth>}>
            <Route path="/admin" element={<ListaClientesPage />} />
            <Route path="/admin/cliente/:id" element={<DetalheClientePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
```

(Adaptar nomes de export caso `Home`, `AposentadoriaPage`, `SalarioPage` exportem como default — ajustar `import { X }` para `import X` conforme.)

- [ ] **Step 3: Verificar build + dev**

```bash
npm run build && npm run dev
```

Abrir http://localhost:5173/ — confirmar que home/calculadoras existentes carregam normalmente. Acessar `/cadastro`, `/login`, `/privacidade`, `/termos` — confirmar que renderizam (auth pages exigem .env.local com VITE_SUPABASE_URL/KEY apontando para staging).

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): rotas completas com layouts + guards + Toaster + ErrorBoundary"
```

---

## Fase J — Edge Functions (Deno)

### Task 29: Edge Function `notify-new-lead`

**Files:**
- Create: `supabase/functions/notify-new-lead/index.ts`

- [ ] **Step 1: Criar diretório e arquivo**

```bash
mkdir -p supabase/functions/notify-new-lead
```

- [ ] **Step 2: Criar `supabase/functions/notify-new-lead/index.ts`**

```ts
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

    const text = `Novo lead cadastrado no Seu Mapa Financeiro.

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
        from: 'Seu Mapa Financeiro <noreply@meumapafinanceiro.ia.br>',
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
    return new Response('ok', { status: 200 }); // Postgres pg_net não retenta — sempre 200
  }
});
```

- [ ] **Step 3: Deploy para staging**

```bash
npx supabase functions deploy notify-new-lead --project-ref <staging-ref>
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/notify-new-lead/
git commit -m "feat(supabase): Edge Function notify-new-lead (timing-safe, getUserById, html+text)"
```

---

### Task 30: Edge Function `release-client`

**Files:**
- Create: `supabase/functions/release-client/index.ts`
- Create: `supabase/functions/_shared/cors.ts`

- [ ] **Step 1: Criar helper compartilhado de CORS**

```bash
mkdir -p supabase/functions/_shared
```

`supabase/functions/_shared/cors.ts`:

```ts
const ALLOWED_ORIGIN = Deno.env.get('APP_URL') ?? '';

export const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Vary': 'Origin',
} as const;

export function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

- [ ] **Step 2: Criar `supabase/functions/release-client/index.ts`**

```ts
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

Este é um email transacional, parte da execução do serviço. Não é oferta nem recomendação de produto financeiro (ver Termos de Uso: ${appUrl}/termos).

—
Caio Gurgel Guerra, CFP®
Seu Mapa Financeiro · meumapafinanceiro.ia.br
`;
    const html = text.replace(/\n/g, '<br>');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Seu Mapa Financeiro <noreply@meumapafinanceiro.ia.br>',
        to: email,
        subject: 'Seu acesso foi liberado — Seu Mapa Financeiro',
        text, html,
      }),
    });

    return respond({ ok: true, emailSent: res.ok });
  } catch (e) {
    console.error('release-client exception:', e);
    return respond({ error: 'internal' }, 500);
  }
});
```

- [ ] **Step 3: Deploy para staging**

```bash
npx supabase functions deploy release-client --project-ref <staging-ref>
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/release-client/ supabase/functions/_shared/
git commit -m "feat(supabase): Edge Function release-client (CORS, JWT, idempotente, try/catch)"
```

---

### Task 31: Edge Function `delete-own-account`

**Files:**
- Create: `supabase/functions/delete-own-account/index.ts`

- [ ] **Step 1: Criar `supabase/functions/delete-own-account/index.ts`**

```ts
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

    // 2. Ler nome e email antes da deleção
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
      from: 'Seu Mapa Financeiro <noreply@meumapafinanceiro.ia.br>',
      to: email,
      subject: 'Sua conta foi excluída — Seu Mapa Financeiro',
      text: `Olá, ${nome}!

Confirmamos que sua conta no Seu Mapa Financeiro foi excluída em ${ts}, conforme seu pedido (LGPD Art. 18).

Os dados pessoais associados (cadastro, registros de autenticação) foram removidos dos nossos sistemas. Backups técnicos podem reter cópias residuais por até 30 dias antes da rotação automática, conforme política de privacidade.

Em caso de dúvida, fale comigo: caio.gurgel.guerra@gmail.com.
`,
    };

    const adminBody = {
      from: 'Seu Mapa Financeiro <noreply@meumapafinanceiro.ia.br>',
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
```

- [ ] **Step 2: Deploy para staging**

```bash
npx supabase functions deploy delete-own-account --project-ref <staging-ref>
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/delete-own-account/
git commit -m "feat(supabase): Edge Function delete-own-account (atomic, 2 emails LGPD)"
```

---

### Task 32: Edge Function `audit-orphan-leads` + agendamento pg_cron

**Files:**
- Create: `supabase/functions/audit-orphan-leads/index.ts`
- Create: `supabase/migrations/20260508000002_setup_cron_audit.sql`

- [ ] **Step 1: Criar Edge Function**

```ts
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
        from: 'Seu Mapa Financeiro <noreply@meumapafinanceiro.ia.br>',
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
```

- [ ] **Step 2: Migration de pg_cron + agendamento**

`supabase/migrations/20260508000002_setup_cron_audit.sql`:

```sql
-- Habilitar pg_cron (já vem disponível em todos os tiers Supabase)
create extension if not exists pg_cron with schema extensions;

-- Agendar invocação da Edge Function audit-orphan-leads a cada hora
-- O schedule chama a Edge Function via HTTP usando o service_role key.
-- Substituir <PROJECT_REF> pela ref real do projeto antes de aplicar.
select cron.schedule(
  'audit-orphan-leads-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/audit-orphan-leads',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

> Nota operacional: o `service_role_key` precisa ser configurado como custom GUC no projeto Supabase (`alter database postgres set "app.settings.service_role_key" = '...'`) ou substituído inline. Documentar no checklist A.1.

- [ ] **Step 3: Deploy Edge Function**

```bash
npx supabase functions deploy audit-orphan-leads --project-ref <staging-ref>
```

- [ ] **Step 4: Aplicar migration de cron**

Editar `<PROJECT_REF>` no SQL e aplicar via Studio SQL Editor (mais simples que pg_cron via CLI).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/audit-orphan-leads/ supabase/migrations/
git commit -m "feat(supabase): audit-orphan-leads (Edge Function + pg_cron 1h)"
```

---

## Fase K — Setup operacional

### Task 33: Templates Supabase Auth + Database Webhook

**Files:** (configuração externa)

- [ ] **Step 1: Customizar templates Auth no painel (em ambos projetos)**

Authentication → Email Templates → editar:

**"Confirm signup":**
```
Assunto: Confirme seu email — Seu Mapa Financeiro
Corpo:
Olá!

Você se cadastrou no Seu Mapa Financeiro. Confirme seu email clicando no link abaixo:
[Confirmar email]({{ .ConfirmationURL }})

Se não foi você, ignore este email.

—
Caio Gurgel Guerra, CFP®
Seu Mapa Financeiro · meumapafinanceiro.ia.br
```

**"Reset Password":**
```
Assunto: Redefinir senha — Seu Mapa Financeiro
Corpo:
Olá!

Recebemos uma solicitação para redefinir sua senha. Clique no link abaixo (válido por 1 hora):
[Redefinir senha]({{ .ConfirmationURL }})

Se não foi você, ignore este email.

—
Caio Gurgel Guerra, CFP®
Seu Mapa Financeiro · meumapafinanceiro.ia.br
```

- [ ] **Step 2: Criar Database Webhook AFTER INSERT em profiles (ambos projetos)**

Database → Webhooks → "Create new webhook":
- Name: `notify-new-lead-trigger`
- Table: `profiles`
- Events: `INSERT`
- Webhook type: `Supabase Edge Functions`
- Edge function: `notify-new-lead`
- HTTP Headers: adicionar `x-webhook-secret` com valor de `WEBHOOK_SECRET` (mesmo configurado nos Function Secrets)

- [ ] **Step 3: (sem commit — operação manual)**

Documentar valores configurados em planilha pessoal de Caio.

---

### Task 34: DNS Resend (SPF audit, DKIM, DMARC)

**Files:** (configuração externa de DNS)

- [ ] **Step 1: Auditar SPF existente**

```bash
dig +short TXT meumapafinanceiro.ia.br | grep "v=spf1"
```

Se vazio: criar `v=spf1 include:_spf.resend.com ~all`. Se já houver registro (Google/Outlook/etc): **mergear includes em um único registro** — RFC 7208 só permite 1 SPF por domínio.

- [ ] **Step 2: Adicionar domínio no Resend**

Painel Resend → Domains → Add Domain → `meumapafinanceiro.ia.br`. Copiar registros DKIM (3 CNAMEs) e DMARC.

- [ ] **Step 3: Configurar DNS no registro.br (modo avançado)**

Adicionar:
- 3 CNAMEs DKIM (resend gera específicos)
- TXT SPF (mergeado se necessário)
- TXT DMARC:
  ```
  _dmarc.meumapafinanceiro.ia.br TXT "v=DMARC1; p=none; rua=mailto:caio.gurgel.guerra@gmail.com; ruf=mailto:caio.gurgel.guerra@gmail.com; fo=1; pct=100"
  ```

- [ ] **Step 4: Aguardar propagação (24-48h) e verificar**

Painel Resend → Domain → confirmar status "Verified". Testar DKIM com `dig` e https://www.dmarcanalyzer.com/dmarc-analyzer/.

- [ ] **Step 5: Warmup**

Enviar 5-10 emails de teste do `noreply@meumapafinanceiro.ia.br` para inboxes próprios (Gmail, Outlook). Confirmar que chegam fora do spam.

- [ ] **Step 6: (sem commit — operação manual)**

Marcar checklist A.1 do spec.

---

## Fase L — Validação

### Task 35: Smoke test pós-deploy (~25 min)

**Files:** (operação manual em staging primeiro, depois em prod)

- [ ] **Step 1: Caminho feliz**

Seguir literalmente o checklist da §7.7 do spec — "Caminho feliz" (15 itens). Anotar resultado de cada item.

- [ ] **Step 2: Auth edge cases**

Seguir os 11 itens da §7.7 "Auth edge cases" — incluindo email duplicado, honeypot, recuperar senha, link expirado, `next=` sanitizado, duas abas, `RequireGuest`, modal de exclusão.

- [ ] **Step 3: Robustez de trigger e profile órfão**

Seguir os 2 itens da §7.7 (caminho whitelist via `curl admin/users` + caminho não-whitelist com data futura).

> Antes de rodar `curl` com `SERVICE_ROLE_KEY`, executar `unset HISTFILE` para evitar leak em shell history.

- [ ] **Step 4: Resend / falhas de email (em STAGING apenas)**

Seguir os 2 itens da §7.7 — setar `RESEND_API_KEY` inválida em staging e testar.

- [ ] **Step 5: Mobile e a11y**

Seguir os 5 itens da §7.7 (viewport 375px, foco pós-submit, etc).

- [ ] **Step 6: Documentar resultados**

Criar/atualizar `docs/superpowers/smoke-results-YYYYMMDD.md` com checklist marcado e quaisquer falhas observadas.

---

### Task 36: Teste RLS via curl (§7.5)

**Files:** (operação manual)

- [ ] **Step 1: Criar 2 usuários de teste em staging**

Studio staging → Authentication → Users → Add user (Auto Confirm = ON):
- `userA@test.com` / senha `TestPass123!`
- `userB@test.com` / senha `TestPass123!`

(O admin de teste já foi criado na Task 6.)

- [ ] **Step 2: Pegar JWT de cada usuário**

```bash
unset HISTFILE
SUPABASE_URL=https://<staging-ref>.supabase.co
ANON_KEY=<staging-anon-key>

JWT_A=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"userA@test.com","password":"TestPass123!"}' | jq -r .access_token)

# Repetir para userB e admin
```

- [ ] **Step 3: Rodar 17 casos do spec §7.5**

Para cada caso (1-17), executar `curl` correspondente e confirmar resposta esperada. Exemplos:

```bash
# Caso 1: userA SELECT
curl -s "$SUPABASE_URL/rest/v1/profiles?select=*" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $JWT_A" | jq

# Caso 15: EXPLAIN ANALYZE da query do admin (rodar via SQL Editor com service_role)
```

- [ ] **Step 4: Documentar resultados**

Tabela em `docs/superpowers/smoke-results-YYYYMMDD.md` com 17 casos marcados PASS/FAIL.

- [ ] **Step 5: Repetir casos críticos em PRODUÇÃO**

Após validar em staging, repetir pelo menos casos 1, 5, 6, 8, 14b em produção (com Caio admin), tomando cuidado de **não criar lixo** na base de produção.

---

### Task 37: Deploy final em produção

**Files:** (operação)

- [ ] **Step 1: Aplicar migration em produção (se ainda não estiver)**

```bash
npx supabase link --project-ref <prod-ref>
npx supabase db push
```

- [ ] **Step 2: Deploy todas as Edge Functions em produção**

```bash
npx supabase functions deploy notify-new-lead --project-ref <prod-ref>
npx supabase functions deploy release-client --project-ref <prod-ref>
npx supabase functions deploy delete-own-account --project-ref <prod-ref>
npx supabase functions deploy audit-orphan-leads --project-ref <prod-ref>
```

- [ ] **Step 3: Configurar Webhook + Templates Auth + cron em produção**

Repetir Task 33 e Task 32 Step 4 no projeto de produção.

- [ ] **Step 4: Push do código no master**

```bash
git push origin master
```

EasyPanel auto-deploya o frontend.

- [ ] **Step 5: Smoke rápido em produção (10 min)**

Repetir os 5 itens críticos da §7.7 contra a URL pública `https://www.meumapafinanceiro.ia.br`:
- Cadastrar conta de teste pessoal
- Receber email de confirmação
- Login → /aguardando
- Caio (admin) recebe email "novo lead"
- Liberar → cliente recebe email "acesso liberado"
- Logout

- [ ] **Step 6: Anunciar no canal de status do Caio**

Marcar A.1 checklist como completo. Documentar quaisquer ajustes pós-deploy.

---

## Anexo: Bloqueadores externos remanescentes (não fazem parte deste plano)

Os seguintes itens da A.1 do spec **não são tasks de código** — são pré-requisitos operacionais que Caio resolve em paralelo:

- DPA Supabase + Resend assinados
- Política `/privacidade` revisada por advogado próprio (texto final)
- CNPJ/regime societário definido (atualiza item 1 da política)
- Número Planejar para CFP® (atualiza Footer.tsx)
- Conteúdo final de `/termos` com disclaimer CVM 178/2023
- `docs/legal/lia-ip-logs.md` escrito (3 perguntas LIA)
- Planilha `lgpd-registro-operacoes` criada
- Cofre digital de credenciais com sucessor designado

Esses itens NÃO impedem início e progressão da implementação (Tasks 1-37). Apenas bloqueiam o **go-live final**.

---

## Self-Review (executado pelo planejador)

**Spec coverage:** Todas as seções do spec mapeiam para tasks:
- §1 (Visão geral) — task 28 (App.tsx) cobre arquitetura
- §2 (Modelo de dados) — tasks 5, 6 (migration + setup admin)
- §3 (Auth e telas) — tasks 7-15 (hooks/guards/layouts) + 19-24 (pages auth/cliente)
- §4 (Admin) — tasks 25-27
- §5 (Emails/Edge Functions) — tasks 29-32
- §6 (Estrutura) — tasks 3-4 (lib helpers) + 12-15 (componentes) + 28 (App.tsx)
- §7 (Erros/testes/release) — tasks 33-37
- §8 (Trade-offs) — documentado, não requer implementação
- A.1 (checklist) — anexo do plano

**Type consistency:** `Profile`/`ProfileWithEmail`/`ClientStatus` definidos uma vez em Task 3, usados em todas as tasks subsequentes; `useProfile` retorna `ProfileState & { refetch }` consistentemente; `releaseClient`/`rejectClient`/`deleteOwnAccount` retornam `{ ok: ... }` consistentemente.

**Sem placeholders críticos:** Onde o plano referencia "literal do spec §X" (PrivacidadePage, MeusDadosPage campos repetidos), é redirecionamento para texto/estrutura já documentada no spec — não TODO. Nomes `<NUMERO_PLANEJAR>`, `<DATA_NASC_REAL>` em SQL/JSX são placeholders intencionais que viram bloqueadores externos no anexo.

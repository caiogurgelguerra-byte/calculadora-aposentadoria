# Onboarding CFP — Fase 1A (Design)

**Data:** 2026-05-07
**Autor:** Caio Gurgel Guerra (planejador CFP)
**Status:** Design aprovado, pronto pra plano de implementação
**Escopo:** Fase 1A do onboarding de clientes para consultoria CFP, integrado ao portal `meumapafinanceiro.ia.br`

---

## 1. Visão geral

### 1.1 Produto

O portal **Seu Mapa Financeiro** já possui calculadoras públicas de aposentadoria e salário CLT em produção. Esta fase adiciona um **funil de captação + onboarding** para a consultoria CFP humana feita pelo Caio.

**Não é uma ferramenta self-service.** O cliente coleta dados; o Caio analisa e atende manualmente. Os índices CFP (liquidez, endividamento, comprometimento, poupança, reserva de emergência indicada) são calculados nas fases futuras e exibidos **apenas no painel admin** — o cliente nunca vê o diagnóstico antes da consultoria.

### 1.2 Decomposição em fases

| Fase | Escopo | Estimativa |
|---|---|---|
| **1A** (este spec) | Auth + cadastro + admin liberar + emails | ~1 semana |
| 1B | Wizard patrimonial (bens de uso, bens de não-uso, dívidas) + dashboard cliente | ~2 semanas |
| 2 | Fluxo de caixa (receitas e despesas, fixa+variável) | a definir |
| 3 | Diagnóstico CFP (índices, reserva indicada) — **só admin** | a definir |

Cada fase tem seu próprio spec, plano e PR. Este documento cobre apenas a Fase 1A.

### 1.3 Fluxo do usuário (Fase 1A)

```
1. Cliente acessa portal e clica "Quero fazer minha consultoria"
2. Cadastro completo (7 campos pessoais + email/senha)
3. Email de confirmação Supabase (built-in)
4. Cliente confirma email → status = "lead"
5. Login → tela /aguardando ("Você está na fila, em breve liberaremos seu acesso")
6. Caio recebe email automático "Novo lead: <nome>"
7. Caio acessa /admin, vê lista de leads, clica "Liberar onboarding"
8. Status muda para "liberado" → email "Seu acesso foi liberado" pro cliente
9. Cliente loga novamente → tela /liberado ("Em breve você poderá preencher seus dados") — placeholder até Fase 1B
```

### 1.4 Arquitetura

```
[Cliente browser]
      │
      ├─► [Portal Vite/React (existente)]
      │     ├─ Rotas públicas: /, /aposentadoria, /salario (intactas)
      │     ├─ Rotas auth: /cadastro, /login, /recuperar-senha, /redefinir-senha, /privacidade
      │     ├─ Rotas cliente: /aguardando, /liberado
      │     └─ Rotas admin: /admin, /admin/cliente/:id
      │
      ▼
[Supabase (novo)]
      ├─ Auth (email + senha, confirmação por email)
      ├─ Postgres + RLS (tabela profiles)
      └─ Edge Functions (notify-new-lead, notify-client-released)
              │
              ▼
        [Resend API (novo)]
              │
              ▼
        Emails transacionais (Caio + Cliente)
```

**Stack adicionada:**
- `@supabase/supabase-js` (cliente JS)
- `react-hook-form` + `zod` + `@hookform/resolvers` (formulários)

**Stack mantida intacta:** React 18, Vite 6, TypeScript, Tailwind, react-router-dom 7, Vitest.

---

## 2. Modelo de dados (Supabase Postgres)

### 2.1 Migration inicial

Arquivo: `supabase/migrations/20260507000001_init_profiles.sql`

```sql
-- ============================================================
-- Enums
-- ============================================================

create type client_status as enum (
  'lead',
  'liberado',
  'em_onboarding',
  'submetido',
  'em_consultoria',
  'concluido'
);

create type estado_civil as enum (
  'solteiro',
  'casado',
  'uniao_estavel',
  'divorciado',
  'viuvo'
);

create type regime_trabalho as enum (
  'clt',
  'pj',
  'autonomo',
  'servidor_publico',
  'empresario',
  'aposentado',
  'outro'
);

-- ============================================================
-- Tabela profiles
-- ============================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  -- Dados pessoais (Fase 1A)
  nome_completo    text not null,
  data_nascimento  date not null check (data_nascimento <= current_date),
  estado_civil     estado_civil not null,
  dependentes      int[] not null default '{}',     -- idades dos dependentes
  profissao        text not null,
  regime_trabalho  regime_trabalho not null,
  cidade           text not null,
  uf               char(2) not null check (uf ~ '^[A-Z]{2}$'),
  telefone         text not null,                   -- formato armazenado: +55 (XX) XXXXX-XXXX

  -- Controle
  status     client_status not null default 'lead',
  is_admin   boolean not null default false,

  -- Auditoria
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_status_idx on profiles(status);
create index profiles_is_admin_idx on profiles(is_admin) where is_admin = true;

-- ============================================================
-- Trigger updated_at
-- ============================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ============================================================
-- Helper: is_admin() (SECURITY DEFINER evita recursão em RLS)
-- ============================================================

create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select is_admin from profiles where id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- RLS
-- ============================================================

alter table profiles enable row level security;

-- Policy 1: SELECT (próprio perfil OU admin vê todos)
create policy profiles_select on profiles
  for select
  using (
    auth.uid() = id
    or is_admin()
  );

-- Policy 2: INSERT (usuário cria próprio perfil, sempre is_admin=false)
create policy profiles_insert on profiles
  for insert
  with check (
    auth.uid() = id
    and is_admin = false
    and status = 'lead'
  );

-- Policy 3: UPDATE próprio (não pode mudar status nem is_admin)
create policy profiles_update_self on profiles
  for update
  using (auth.uid() = id and not is_admin())
  with check (
    auth.uid() = id
    and status = (select status from profiles where id = auth.uid())
    and is_admin = (select is_admin from profiles where id = auth.uid())
  );

-- Policy 4: UPDATE admin (admin pode atualizar qualquer perfil)
create policy profiles_update_admin on profiles
  for update
  using (is_admin())
  with check (is_admin());
```

### 2.2 Notas sobre o modelo

- **Enum `client_status` definido completo desde já** para evitar migrações de schema futuro quando as Fases 1B/2/3 forem entrar.
- **Dependentes como `int[]`** (idades) — simples, evita tabela secundária e cobre a necessidade real (precisamos da idade para projeção, não nomes).
- **`is_admin` na própria tabela `profiles`** em vez de tabela separada — Fase 1A só vai ter 1 admin (o Caio). Setar manualmente via SQL após primeiro signup.
- **`is_admin()` como SECURITY DEFINER** é o padrão Supabase para evitar recursão infinita quando RLS consulta a própria tabela.

### 2.3 Setup pós-migration

Após Caio fazer o primeiro signup em produção, rodar uma vez no SQL Editor do Supabase Studio:

```sql
update profiles
set is_admin = true
where id = (select id from auth.users where email = 'caio.gurgel.guerra@gmail.com');
```

---

## 3. Auth e telas do cliente

### 3.1 Rotas

| Rota | Acesso | Componente |
|---|---|---|
| `/` (existente) | público | Home |
| `/aposentadoria` (existente) | público | AposentadoriaPage |
| `/salario` (existente) | público | SalarioPage |
| `/cadastro` | público (sem sessão) | CadastroPage |
| `/login` | público (sem sessão) | LoginPage |
| `/recuperar-senha` | público | RecuperarSenhaPage |
| `/redefinir-senha` | público (com token na URL) | RedefinirSenhaPage |
| `/privacidade` | público | PrivacidadePage |
| `/aguardando` | autenticado, status=`lead` | AguardandoPage |
| `/liberado` | autenticado, status=`liberado` ou superior | LiberadoPage |
| `/admin` | autenticado, `is_admin=true` | ListaClientesPage |
| `/admin/cliente/:id` | autenticado, `is_admin=true` | DetalheClientePage |

### 3.2 Guards

- `<RequireAuth>`: redireciona pra `/login` se não houver sessão. Após login, redireciona pra rota original.
- `<RequireAdmin>`: redireciona pra `/aguardando` ou `/liberado` (conforme status) se não for admin.
- **Redirect inteligente pós-login** (no `LoginPage` ou hook):
  - Se `is_admin` → `/admin`
  - Se `status='lead'` → `/aguardando`
  - Caso contrário → `/liberado`

### 3.3 Cadastro (CadastroPage)

Formulário único com **7 campos pessoais + email + senha + confirmar senha**. Após submit:
1. Chama `supabase.auth.signUp({ email, password })`
2. Em sucesso, insere linha em `profiles` com os dados pessoais
3. Mostra mensagem "Confirme seu email para continuar"

**Campos:**
- Nome completo
- Data de nascimento (date input)
- Estado civil (select)
- Dependentes — array dinâmico de idades (botão "+ adicionar dependente", botão "remover" por linha; vazio é válido)
- Profissão (texto livre)
- Regime de trabalho (select)
- Cidade
- UF (select com 27 estados)
- Telefone (com máscara `+55 (XX) XXXXX-XXXX`)
- Email
- Senha (mínimo 8 caracteres, mostrar regra)
- Confirmar senha
- Checkbox "Li e concordo com a [Política de Privacidade](/privacidade)" (obrigatório)

### 3.4 Tela /aguardando

Para clientes com `status='lead'`. Texto:

> **Você está na fila!**
>
> Recebemos seu cadastro. Para garantir um atendimento de qualidade, eu (Caio Gurgel, planejador certificado pelo CFP) reviso pessoalmente cada cliente antes de liberar o onboarding.
>
> Você receberá um email quando seu acesso for liberado, geralmente em até 48h úteis.
>
> Se tiver dúvidas, fale comigo no WhatsApp: [link].

Botão de logout no topo.

### 3.5 Tela /liberado (placeholder Fase 1A)

Para clientes com `status='liberado'`. Texto:

> **Acesso liberado!**
>
> Em breve você poderá preencher os dados do seu planejamento aqui.
>
> Por enquanto, fique atento ao seu email — vou entrar em contato em breve para combinarmos os próximos passos.

Botão de logout. (A UI real do wizard patrimonial entra na Fase 1B.)

### 3.6 Política de privacidade (`/privacidade`)

Texto curto, próprio para Fase 1A:

> **Política de Privacidade — Seu Mapa Financeiro**
>
> *Última atualização: 07 de maio de 2026* <!-- atualizar a cada revisão do texto -->
>
> 1. **Coletamos** apenas os dados que você fornece voluntariamente no cadastro: nome, data de nascimento, estado civil, dependentes, profissão, regime de trabalho, cidade, UF e telefone.
> 2. **Usamos** esses dados exclusivamente para prestação dos serviços de planejamento financeiro contratados.
> 3. **Não compartilhamos** seus dados com terceiros, exceto fornecedores essenciais para operação da plataforma (Supabase para hospedagem segura e Resend para envio de emails transacionais).
> 4. **Armazenamento** em servidores com criptografia em repouso e em trânsito (TLS).
> 5. **Seus direitos** (LGPD): você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento pelo email caio.gurgel.guerra@gmail.com.
> 6. **Retenção:** mantemos seus dados enquanto a relação consultiva estiver ativa. Após encerramento, conservamos por mais 5 anos para fins regulatórios e legais.
>
> Em caso de dúvidas, contato: caio.gurgel.guerra@gmail.com.

---

## 4. Admin minimalista

### 4.1 `/admin` — Lista de clientes (ListaClientesPage)

Tabela simples (sem paginação na Fase 1A — esperamos < 100 clientes):

| Nome | Email | Status | Cadastrado em | Ação |
|---|---|---|---|---|
| João Silva | joao@... | lead | 06/05/2026 | [Liberar] [Ver detalhes] |
| Maria Costa | maria@... | em_consultoria | 03/05/2026 | [Ver detalhes] |

**Filtros:** select de status no topo (todos / lead / liberado / em_onboarding / submetido / em_consultoria / concluido).

**Botão "Liberar":**
- Aparece apenas para `status='lead'`
- Ao clicar: confirma com modal "Liberar onboarding de <nome>?"
- Em sucesso: status vira `liberado`, dispara Edge Function `notify-client-released`
- Toast "Cliente liberado. Email enviado."

### 4.2 `/admin/cliente/:id` — Detalhe (DetalheClientePage)

Mostra todos os campos do `profiles` em modo leitura, agrupados em seções:
- Identificação (nome, email, telefone)
- Dados pessoais (data nasc, idade calculada, estado civil, dependentes, profissão, regime)
- Endereço (cidade, UF)
- Status e timestamps

Sem edição na Fase 1A. Botão "Voltar" pro `/admin`.

### 4.3 Acesso

Setado manualmente via SQL no primeiro deploy (ver §2.3). Nenhuma UI para gerenciar admins na Fase 1A.

---

## 5. Emails transacionais (Resend)

### 5.1 Inventário

| # | Email | Quem dispara | Quem recebe | Mecanismo |
|---|---|---|---|---|
| 1 | Confirmação de cadastro | Supabase Auth (built-in) | Cliente | Template Supabase customizado em PT-BR |
| 2 | Reset de senha | Supabase Auth (built-in) | Cliente | Template Supabase customizado em PT-BR |
| 3 | Novo lead cadastrou | Edge Function `notify-new-lead` | Caio | Resend |
| 4 | Acesso liberado | Edge Function `notify-client-released` | Cliente | Resend |

### 5.2 Templates Supabase (1 e 2)

Customizar no painel Supabase → Auth → Email Templates:

**Confirmação de cadastro:**
> **Assunto:** Confirme seu email — Seu Mapa Financeiro
>
> Olá!
>
> Você se cadastrou no Seu Mapa Financeiro. Confirme seu email clicando no link abaixo:
>
> [Confirmar email]({{ .ConfirmationURL }})
>
> Se não foi você, ignore este email.

**Reset de senha:**
> **Assunto:** Redefinir senha — Seu Mapa Financeiro
>
> Olá!
>
> Recebemos uma solicitação para redefinir sua senha. Clique no link abaixo (válido por 1 hora):
>
> [Redefinir senha]({{ .ConfirmationURL }})
>
> Se não foi você, ignore este email.

### 5.3 Edge Function: `notify-new-lead`

Arquivo: `supabase/functions/notify-new-lead/index.ts`

**Disparo:** chamada explícita do frontend após `INSERT` em `profiles` ter sucesso. (Trigger via Webhook do Supabase também é viável, mas explicit-call é mais simples e debuggável.)

**Input:** `{ leadName: string, leadEmail: string }`

**Output:** `{ ok: true }` ou `{ ok: false, error: string }` (frontend ignora erro — não bloqueia fluxo)

**Email:**
- **De:** `noreply@meumapafinanceiro.ia.br`
- **Para:** `ADMIN_NOTIFICATION_EMAIL` (env var)
- **Assunto:** `Novo lead: ${leadName}`
- **Corpo:**
  > Novo lead cadastrado no Seu Mapa Financeiro.
  >
  > **Nome:** ${leadName}
  > **Email:** ${leadEmail}
  >
  > Acesse o painel admin para revisar: ${APP_URL}/admin

### 5.4 Edge Function: `notify-client-released`

Arquivo: `supabase/functions/notify-client-released/index.ts`

**Disparo:** chamada do frontend após `UPDATE` de `profiles.status` de `lead` → `liberado`.

**Input:** `{ clientName: string, clientEmail: string }`

**Output:** `{ ok: true }` ou `{ ok: false, error: string }`

**Email:**
- **De:** `noreply@meumapafinanceiro.ia.br`
- **Para:** `clientEmail`
- **Assunto:** Seu acesso foi liberado — Seu Mapa Financeiro
- **Corpo:**
  > Olá, ${clientName}!
  >
  > Seu acesso foi liberado. Em breve entraremos em contato para combinarmos os próximos passos.
  >
  > Acesse o portal: ${APP_URL}/login
  >
  > —
  > Caio Gurgel Guerra, CFP®

### 5.5 Variáveis de ambiente

**EasyPanel (frontend):**
```
VITE_SUPABASE_URL=https://<projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Supabase Functions Secrets:**
```
RESEND_API_KEY=re_...
ADMIN_NOTIFICATION_EMAIL=caio.gurgel.guerra@gmail.com
APP_URL=https://www.meumapafinanceiro.ia.br
```

### 5.6 Domínio do Resend

Antes do go-live, verificar `meumapafinanceiro.ia.br` no Resend:
1. Adicionar domínio no painel Resend
2. Copiar registros SPF, DKIM (3 CNAMEs), DMARC
3. Cadastrar no DNS do registro.br (modo avançado, já habilitado conforme deploy stack)
4. Aguardar propagação (até 24h)
5. Confirmar verificação no Resend antes de enviar primeiro email

**Falha de email NÃO bloqueia o fluxo.** O frontend ignora retornos de erro das Edge Functions; admin acompanha leads pelo `/admin` e o cliente sempre vê tela de sucesso. Fallback combinado: WhatsApp.

---

## 6. Estrutura de arquivos e convenções

### 6.1 Árvore de arquivos novos

```
src/
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # createClient() singleton
│   │   └── types.ts               # Tipos derivados do schema (Profile, ClientStatus, etc.)
│   ├── auth/
│   │   ├── schemas.ts             # Zod schemas (cadastroSchema, loginSchema, etc.)
│   │   └── mutations.ts           # signUp, signIn, signOut, resetPassword, updatePassword
│   └── notifications/
│       ├── sendNewLeadEmail.ts    # Wrapper da Edge Function
│       └── sendClientReleasedEmail.ts
├── hooks/
│   └── auth/
│       ├── useAuth.ts             # Sessão atual (useEffect onAuthStateChange)
│       └── useProfile.ts          # Profile do usuário logado (com loading/error)
├── components/
│   ├── RequireAuth.tsx
│   ├── RequireAdmin.tsx
│   └── forms/
│       ├── FormField.tsx          # Wrapper com label + erro + tooltip
│       ├── UFSelect.tsx           # Select dos 27 estados
│       └── DependentesInput.tsx   # Array dinâmico de idades
├── pages/
│   ├── auth/
│   │   ├── CadastroPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RecuperarSenhaPage.tsx
│   │   ├── RedefinirSenhaPage.tsx
│   │   └── PrivacidadePage.tsx
│   ├── cliente/
│   │   ├── AguardandoPage.tsx
│   │   └── LiberadoPage.tsx
│   └── admin/
│       ├── ListaClientesPage.tsx
│       └── DetalheClientePage.tsx
└── App.tsx                        # MODIFICADO: adicionar rotas novas

supabase/                          # NOVO
├── migrations/
│   └── 20260507000001_init_profiles.sql
└── functions/
    ├── notify-new-lead/
    │   └── index.ts
    └── notify-client-released/
        └── index.ts
```

### 6.2 Convenções

**Formulários:** sempre via `react-hook-form` + `zod` (`zodResolver`). Schemas em `src/lib/auth/schemas.ts`. Nada de validação manual em `onChange`.

**Mutations Supabase:** centralizadas em `src/lib/auth/mutations.ts`. Componentes só chamam funções (`signUp(data)`), nunca `supabase.auth.signUp(...)` direto. Facilita teste e troca futura.

**Tipos:** gerados via `supabase gen types typescript` quando possível, manualmente espelhados em `src/lib/supabase/types.ts` na Fase 1A pra evitar setup adicional.

**Estilo:** seguir padrão visual existente (memória `project_estrutura_calculadora`):
- Header gradient azul: `bg-gradient-to-r from-blue-900 to-indigo-700 px-6 py-5`
- Cards: `bg-white rounded-xl shadow-sm border border-gray-100 p-6`
- Inputs: `border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500`
- Tooltips pedagógicos curtos abaixo de cada input (memória `feedback_tooltips_pedagogicos`)

**Erros:** mensagens em PT-BR centralizadas (próxima seção).

---

## 7. Tratamento de erros, testes e release

### 7.1 Tratamento de erros — auth

| Cenário | UX | Mensagem |
|---|---|---|
| Email já cadastrado no signup | Toast erro + link "fazer login" / "esqueci senha" | "Este email já está cadastrado. Faça login ou recupere sua senha." |
| Email não confirmado tenta logar | Toast com botão "reenviar email" | "Confirme seu email antes de fazer login. [Reenviar link]" |
| Senha errada | Erro genérico (não revelar se email existe) | "Email ou senha incorretos." |
| Senha curta no signup | Erro inline no campo (Zod) | "A senha deve ter ao menos 8 caracteres." |
| Senhas não conferem | Erro inline (Zod) | "As senhas não conferem." |
| Token de reset expirado | Tela de erro com link pra `/recuperar-senha` | "Link expirado. Solicite um novo." |

### 7.2 Tratamento de erros — rede / Supabase

- Toast genérico: "Erro ao salvar. Tente novamente em instantes."
- Form preserva estado (RHF não limpa em erro)
- Sem retry automático na Fase 1A

### 7.3 Tratamento de erros — guards

| Tentativa | Resultado |
|---|---|
| `/admin` sem `is_admin=true` | Redirect: `/aguardando` se status=lead, senão `/liberado` |
| `/aguardando` com status≠lead | Redirect: `/liberado` se admin não, `/admin` se admin |
| `/liberado` com status=lead | Redirect: `/aguardando` |
| Qualquer rota protegida sem sessão | Redirect: `/login?next=<rota_original>` |

### 7.4 Validação dupla

- **Client (Zod):** UX rápida, formato de telefone/idade (0-120), data de nascimento ≤ hoje, UF ∈ {27 estados}, checkbox aceito.
- **Server (RLS + check constraints):** linha de defesa final. UF regex, data_nascimento ≤ hoje, idades de dependentes ≥ 0.

Confiar no RLS, não na UI. Nunca remover policies "porque o frontend já valida".

### 7.5 Testes

Pela preferência registrada (`feedback_workflow_leve` — testes só em lógica de cálculo):

- **Sem testes unitários novos** na Fase 1A. É CRUD + auth, não tem lógica de cálculo.
- **Smoke test manual obrigatório** antes do release (checklist em §7.7).
- **Teste de RLS** via SQL no Supabase Studio antes do go-live (não opcional — mal configurado vaza dados entre clientes).

**Roteiro de teste RLS (no SQL Editor com 2 usuários):**
```sql
-- Como user1 (não admin), tentar SELECT em todos os perfis:
set local request.jwt.claim.sub = '<user1-uuid>';
select * from profiles;
-- Esperado: só linha do user1.

-- Como user1, tentar UPDATE no próprio status:
update profiles set status = 'liberado' where id = '<user1-uuid>';
-- Esperado: erro (RLS rejeita)

-- Como admin, tentar UPDATE em qualquer perfil:
set local request.jwt.claim.sub = '<admin-uuid>';
update profiles set status = 'liberado' where id = '<user1-uuid>';
-- Esperado: sucesso.
```

### 7.6 Plano de release

**Pré-requisitos manuais (uma vez só):**

1. Criar projeto Supabase em supabase.com → copiar URL e anon key
2. **Iniciar verificação de domínio no Resend imediatamente** (DNS pode levar até 24h)
3. Customizar templates de email Supabase em PT-BR (textos da §5.2)
4. Configurar redirect URLs no Supabase Auth: `https://www.meumapafinanceiro.ia.br/redefinir-senha`, `https://www.meumapafinanceiro.ia.br/login`
5. Adicionar env vars no EasyPanel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
6. Adicionar secrets no Supabase: `RESEND_API_KEY`, `ADMIN_NOTIFICATION_EMAIL`, `APP_URL`

**Sequência de deploy:**

1. Aplicar migration `supabase/migrations/20260507000001_init_profiles.sql` (CLI ou Studio)
2. Deploy Edge Functions: `supabase functions deploy notify-new-lead && supabase functions deploy notify-client-released`
3. Push do código no master → EasyPanel auto-deploy via Dockerfile/nginx
4. **Primeiro signup do Caio em produção** + setar `is_admin=true` via SQL (ver §2.3)
5. Smoke test (§7.7)

### 7.7 Smoke test pós-deploy (~10 min)

- [ ] Acessar `/cadastro` em incógnito, criar conta de teste
- [ ] Email de confirmação chega no inbox; link funciona
- [ ] Login redireciona pra `/aguardando` (status=lead)
- [ ] Email "novo lead" chega no inbox do Caio
- [ ] Caio loga, acessa `/admin`, vê o lead listado
- [ ] Clica "Liberar" → status muda no banco
- [ ] Email "acesso liberado" chega no inbox do cliente teste
- [ ] Cliente teste faz logout, loga novamente → redireciona pra `/liberado`
- [ ] Cliente teste tenta acessar `/admin` → redirect pra `/liberado`
- [ ] `/recuperar-senha` envia email; link funciona; nova senha permite login
- [ ] Rotas antigas intactas: `/`, `/aposentadoria`, `/salario` (cliente logado e deslogado)

### 7.8 Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Verificação DNS Resend pode levar 24h+ | Iniciar **antes** de implementar. Sem domínio verificado, emails 3-4 não saem. |
| Cadastro aberto vira alvo de bots | Aceitar na Fase 1A; se virar problema, adicionar Cloudflare Turnstile na 1B. |
| RLS mal escrita vaza dados | Roteiro de teste RLS obrigatório no plano de release. |
| Caio esquece o `update profiles set is_admin=true` | Documentar no spec; primeiro signup vai pra `/aguardando` mesmo, então não trava nada visível. |
| Trigger de email na transição lead→liberado é frágil (chamada explícita do front) | Aceito na Fase 1A pela simplicidade. Se houver problemas, migrar pra Database Webhook do Supabase na 1B. |

### 7.9 Observabilidade

- Supabase Logs (auth + Edge Functions) é o suficiente — sem APM externo.
- Erros de email logam mas não bloqueiam fluxo principal.
- Caio acompanha pelo `/admin` se algum lead "sumiu".

---

## Anexos

### A.1 Checklist de prontidão para implementação

- [x] Decisões de produto fechadas
- [x] Modelo de dados desenhado (SQL completo)
- [x] Rotas e guards definidos
- [x] Fluxo de auth descrito
- [x] Templates de email escritos
- [x] Estrutura de arquivos definida
- [x] Smoke test e plano de release prontos
- [ ] **DNS Resend configurado** (bloqueador externo — começar hoje)
- [ ] **Projeto Supabase criado** (bloqueador externo — começar antes do dev)

### A.2 Referências

- Memória anterior: `project_onboarding_cfp_fase1a.md`
- Sessão original (interrompida): `155525ad-8eb2-41e7-95ec-36fdce72d66e.jsonl`
- Stack de deploy: memória `reference_deploy_stack`
- Padrão visual: memória `project_estrutura_calculadora`
- Workflow leve: memória `feedback_workflow_leve`

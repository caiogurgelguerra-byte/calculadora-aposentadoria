# Onboarding CFP — Fase 1A (Design)

**Data:** 2026-05-07 (revisão 2026-05-08, **rodada 3** de code review)
**Autor:** Caio Gurgel Guerra (planejador CFP)
**Status:** Design final, pronto para plano de implementação. Code review em **três rodadas** (5 revisores paralelos cada — 15 reviews independentes) aplicado integralmente. Convergência atingida: a rodada 3 não produziu novos críticos de runtime ou regressões funcionais — apenas refinamentos de redação, consistência e compliance final. Bloqueadores externos (DNS, DPAs, jurídico, CNPJ, número Planejar, LIA) listados em A.1; resolver antes do go-live, **mas não impedem o início da implementação**.
**Escopo:** Fase 1A do onboarding de clientes para consultoria CFP, integrado ao portal `meumapafinanceiro.ia.br`

---

## 1. Visão geral

### 1.1 Produto

O portal **Seu Mapa Financeiro** já possui calculadoras públicas de aposentadoria e salário CLT em produção. Esta fase adiciona um **funil de captação + onboarding** para a consultoria CFP humana feita pelo Caio.

**Não é uma ferramenta self-service.** O cliente coleta dados; o Caio analisa e atende manualmente. Os índices CFP (liquidez, endividamento, comprometimento, poupança, reserva de emergência indicada) são calculados nas fases futuras e exibidos **apenas no painel admin** — o cliente nunca vê o diagnóstico antes da consultoria.

### 1.2 Decomposição em fases

| Fase | Escopo | Estimativa |
|---|---|---|
| **1A** (este spec) | Auth + cadastro + admin liberar/recusar + emails | ~1 semana |
| 1B | Wizard patrimonial (bens de uso, bens de não-uso, dívidas) + dashboard cliente | ~2 semanas |
| 2 | Fluxo de caixa (receitas e despesas, fixa+variável) | a definir |
| 3 | Diagnóstico CFP (índices, reserva indicada) — **só admin** | a definir |

Cada fase tem seu próprio spec, plano e PR. Este documento cobre apenas a Fase 1A.

### 1.3 Fluxo do usuário (Fase 1A)

```
1. Cliente acessa portal e clica "Quero fazer minha consultoria"
2. Cadastro completo (9 campos pessoais + email/senha)
   → signUp grava dados em raw_user_meta_data
   → trigger Postgres on_auth_user_created cria linha em profiles
3. Email de confirmação Supabase (built-in)
4. Cliente confirma email → primeiro login → tela /aguardando
5. Caio recebe email automático "Novo lead: <nome>"
   (disparado por Database Webhook AFTER INSERT em profiles)
6. Caio acessa /admin, vê lista de leads, clica "Liberar onboarding"
   → Edge Function release-client valida is_admin, faz UPDATE com lock idempotente,
     dispara email "Acesso liberado"
7. Cliente loga novamente → tela /liberado (placeholder até Fase 1B)

Caminhos alternativos:
- Caio clica "Recusar" → status=rejeitado, motivo gravado, sem email automático
- Cliente clica "Corrigir meus dados" em /aguardando → /meus-dados (form editável)
```

### 1.4 Arquitetura

```
[Cliente browser]
      │
      ├─► [Portal Vite/React (existente)]
      │     ├─ Rotas públicas: /, /aposentadoria, /salario (intactas)
      │     ├─ Rotas auth: /cadastro, /login, /recuperar-senha, /redefinir-senha, /privacidade
      │     ├─ Rotas cliente: /aguardando, /liberado, /meus-dados
      │     └─ Rotas admin: /admin, /admin/cliente/:id
      │
      ▼
[Supabase (novo)]
      ├─ Auth (email + senha, email confirmation ON, JWT 1h + Refresh 24h)
      ├─ Postgres + RLS (tabela profiles, view profiles_with_email, triggers de proteção)
      ├─ Database Webhook (AFTER INSERT profiles → notify-new-lead)
      ├─ pg_cron (1h → audit-orphan-leads)
      └─ Edge Functions:
          • notify-new-lead          (chamada por webhook, com secret timing-safe)
          • release-client           (admin → UPDATE + email atomicamente, CORS)
          • delete-own-account       (cliente → exclusão LGPD atômica + 2 emails)
          • audit-orphan-leads       (cron 1h → detecta webhook silencioso)
              │
              ▼
        [Resend API (novo)]
              │
              ▼
        Emails transacionais (Caio + Cliente, html + text)
```

**Stack adicionada:**
- `@supabase/supabase-js` (cliente JS)
- `react-hook-form` + `zod` + `@hookform/resolvers` (formulários)
- `sonner` (toast lib — leve, sem dependências, hook moderno)

**Stack mantida intacta:** React 18, Vite 6, TypeScript, Tailwind, react-router-dom 7, Vitest.

**Notas de segurança da arquitetura:**
- `VITE_SUPABASE_ANON_KEY` é exposta no bundle JS por design — segurança fica em RLS no Postgres + validação JWT nas Edge Functions. Nunca usar `service_role` no frontend.
- Edge Functions validam o JWT do chamador e re-derivam dados sensíveis do banco; nunca confiam em payload do cliente.

---

## 2. Modelo de dados (Supabase Postgres)

### 2.1 Migration inicial

Arquivo: `supabase/migrations/20260507000001_init_profiles.sql`

```sql
-- ============================================================
-- Enums (idempotentes — Postgres não suporta `create type if not exists`,
-- envolver em DO block que captura `duplicate_object`)
-- ============================================================

do $$ begin
  create type public.client_status as enum (
    'lead',
    'rejeitado',
    'liberado',
    'em_onboarding',
    'submetido',
    'em_consultoria',
    'concluido'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estado_civil as enum (
    'solteiro',
    'casado',
    'uniao_estavel',
    'divorciado',
    'viuvo'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.regime_trabalho as enum (
    'clt',
    'pj',
    'autonomo',
    'servidor_publico',
    'empresario',
    'aposentado',
    'outro'
  );
exception when duplicate_object then null; end $$;

-- ============================================================
-- Tabela profiles
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  -- Dados pessoais (Fase 1A)
  nome_completo    text not null,
  data_nascimento  date not null,
  estado_civil     public.estado_civil not null,
  dependentes      int[] not null default '{}',                -- idades 0-120
  profissao        text not null,
  regime_trabalho  public.regime_trabalho not null,
  cidade           text not null,
  uf               text not null check (uf ~ '^[A-Z]{2}$'),
  telefone         text not null check (telefone ~ '^\+55[1-9][1-9][0-9]{8,9}$'),
                                                                -- E.164 BR: +55 + DDD (11-99, sem zeros) + 8 ou 9 dígitos

  -- Controle
  status           public.client_status not null default 'lead',
  is_admin         boolean not null default false,
  motivo_rejeicao  text,                                        -- preenchido quando status=rejeitado

  -- Auditoria
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists profiles_created_at_idx on public.profiles(created_at desc);
-- Índice parcial para query principal do admin (`is_admin=false order by created_at desc`):
create index if not exists profiles_admin_list_idx
  on public.profiles(created_at desc) where is_admin = false;

-- ============================================================
-- Trigger updated_at
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- Trigger: criação automática de profile quando auth.users é inserido
-- (Resolve a race condition signUp + INSERT direto, que falharia
-- com email confirmation ON porque auth.uid() é null antes da confirmação.)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta      jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  deps_json jsonb := coalesce(meta->'dependentes', '[]'::jsonb);
  deps_int  int[];
  v_nasc    date;
  v_civil   public.estado_civil;
  v_regime  public.regime_trabalho;
begin
  -- Se metadata não tem array de dependentes, usa vazio
  if jsonb_typeof(deps_json) = 'array' then
    deps_int := array(
      select (value)::int
      from jsonb_array_elements_text(deps_json) as t(value)
    );
  else
    deps_int := array[]::int[];
  end if;

  -- Casts seguros: capturam APENAS erros de formato (mesma whitelist do bloco
  -- exception global no fim) e usam defaults. Bugs de schema (enum renomeado/
  -- removido → undefined_object) DEVEM propagar — não mascarar.
  begin v_nasc := (meta->>'data_nascimento')::date;
  exception when invalid_text_representation or invalid_datetime_format
    then v_nasc := '2000-01-01'::date; end;

  begin v_civil := (meta->>'estado_civil')::public.estado_civil;
  exception when invalid_text_representation
    then v_civil := 'solteiro'; end;

  begin v_regime := (meta->>'regime_trabalho')::public.regime_trabalho;
  exception when invalid_text_representation
    then v_regime := 'outro'; end;

  insert into public.profiles (
    id, nome_completo, data_nascimento, estado_civil, dependentes,
    profissao, regime_trabalho, cidade, uf, telefone
  ) values (
    new.id,
    coalesce(meta->>'nome_completo', ''),
    v_nasc,
    v_civil,
    deps_int,
    coalesce(meta->>'profissao', ''),
    v_regime,
    coalesce(meta->>'cidade', ''),
    upper(coalesce(meta->>'uf', '')),
    coalesce(meta->>'telefone', '+5511000000000')
  );
  return new;
-- WHITELIST de exceções não-fatais (formato de dados corrompido vindo do metadata).
-- Outras exceções (check_violation, raise_exception do trigger validate_domain,
-- bugs de schema, undefined_object em enum novo) DEVEM propagar para abortar
-- o signUp — caso contrário, mascaramos bugs reais como "profile órfão".
exception
  when invalid_text_representation
    or invalid_datetime_format
    or invalid_parameter_value then
    raise warning 'handle_new_user: metadata corrompida para user %: %', new.id, sqlerrm;
    return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Trigger: validação de domínio (substitui CHECK com current_date,
-- que é STABLE e não pode ir em CHECK constraint)
-- ============================================================

create or replace function public.profiles_validate_domain()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Floor de 18 anos: LGPD Art. 14 exige consentimento parental específico
  -- para menores. Fase 1A não suporta esse fluxo, então bloqueia no schema.
  if new.data_nascimento > (current_date - interval '18 years')::date then
    raise exception 'idade mínima 18 anos (data_nascimento deve ser <= hoje - 18 anos)';
  end if;
  if new.data_nascimento < '1900-01-02' then
    raise exception 'data_nascimento deve ser > 1900-01-01';
  end if;
  if exists (select 1 from unnest(new.dependentes) x where x < 0 or x > 120) then
    raise exception 'idade de dependente fora do intervalo [0, 120]';
  end if;
  return new;
end;
$$;

create trigger profiles_validate_domain_trg
  before insert or update on public.profiles
  for each row execute function public.profiles_validate_domain();

-- ============================================================
-- Helper: is_admin() — SECURITY DEFINER + search_path explícito
-- (Sem set search_path, há vulnerabilidade conhecida de privilege
-- escalation; o linter do Supabase flag isso.)
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  -- SECURITY DEFINER bypassa RLS no corpo da função, então a leitura de
  -- public.profiles aqui NÃO dispara recursão na policy SELECT que chama
  -- is_admin(). Mudar para SECURITY INVOKER quebraria isso. STABLE permite
  -- ao planner cachear o resultado dentro da query, evitando N chamadas.
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- Trigger: protege colunas sensíveis em UPDATE não-admin
-- (Substitui a tentativa de "congelar" status/is_admin via subselect
-- em WITH CHECK, que é frágil e dependente de detalhes de MVCC.)
-- ============================================================

create or replace function public.profiles_protect_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    new.status          := old.status;
    new.is_admin        := old.is_admin;
    new.motivo_rejeicao := old.motivo_rejeicao;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_columns_trg
  before update on public.profiles
  for each row execute function public.profiles_protect_columns();

-- ============================================================
-- Trigger: impede admin de remover o próprio is_admin
-- (Sem outro admin, recuperação exigiria SQL no Studio.)
-- ============================================================

create or replace function public.profiles_prevent_self_demote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_admin = true
     and new.is_admin = false
     and old.id = auth.uid() then
    raise exception 'Admin não pode remover o próprio privilégio';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_self_demote_trg
  before update on public.profiles
  for each row execute function public.profiles_prevent_self_demote();

-- ============================================================
-- RLS
-- ============================================================

alter table public.profiles enable row level security;

-- SELECT: próprio perfil OU admin vê todos
create policy profiles_select on public.profiles
  for select
  using (
    auth.uid() = id
    or public.is_admin()
  );

-- INSERT: bloqueado para usuários comuns. A criação é feita pelo
-- trigger handle_new_user() (SECURITY DEFINER, bypass RLS).
-- Esta policy é defesa em profundidade caso alguém tente INSERT direto
-- com a anon key; só permite inserir o próprio perfil sem admin/status.
create policy profiles_insert on public.profiles
  for insert
  with check (
    auth.uid() = id
    and is_admin = false
    and status = 'lead'
    and motivo_rejeicao is null
  );

-- UPDATE próprio: cliente pode editar dados pessoais; trigger
-- profiles_protect_columns garante que status/is_admin/motivo
-- não mudem para não-admin.
create policy profiles_update_self on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- UPDATE admin: admin pode atualizar qualquer perfil
create policy profiles_update_admin on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- DELETE próprio (LGPD Art. 18 — direito de exclusão)
create policy profiles_delete_self on public.profiles
  for delete
  using (auth.uid() = id);

-- DELETE admin
create policy profiles_delete_admin on public.profiles
  for delete
  using (public.is_admin());

-- ============================================================
-- Trigger: impede deletar o ÚLTIMO admin (proteção contra órfão)
-- (Caio é único admin na 1A; CASCADE de auth.users dispara este BEFORE DELETE.)
-- ============================================================

create or replace function public.profiles_prevent_last_admin_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Nota: BEFORE DELETE roda por linha. Em transação multi-DELETE de admins
  -- (cenário improvável na 1A com 1 admin), cada chamada vê o mesmo snapshot
  -- pré-delete. Bloqueio com FOR UPDATE evitaria o race teórico, mas para 1A
  -- (1 admin único) o filtro abaixo já garante que o último não pode sair.
  if old.is_admin = true
     and (select count(*) from public.profiles where is_admin = true) <= 1 then
    raise exception 'Não é possível deletar o último admin. Promova outro usuário primeiro.';
  end if;
  return old;
end;
$$;

create trigger profiles_prevent_last_admin_delete_trg
  before delete on public.profiles
  for each row execute function public.profiles_prevent_last_admin_delete();

-- ============================================================
-- View profiles_with_email — exposta ao PostgREST para o admin listar leads
-- com email do auth.users sem precisar de service_role no frontend.
-- (PostgREST não permite join em schema `auth` por default; query do §4.1
-- com `auth.users!inner(email)` falharia 400 em prod.)
--
-- IMPORTANTE — modelo de segurança da view:
--   * Sem `security_invoker = true` (default em PG 15+ é security_invoker=false):
--     a view executa com permissões do OWNER (postgres na migration).
--     Owner tem SELECT em auth.users e public.profiles, então a view consegue
--     ler ambos. Authenticated NÃO precisa GRANT em auth.users.
--   * O filtro `where (auth.uid() = p.id or public.is_admin())` É a única
--     camada de segurança — espelha a RLS de profiles. SE FOR REMOVIDO, vaza
--     email de todos os usuários para qualquer authenticated.
--   * `security_barrier = true` impede vazamento via predicates leaky vindos
--     do PostgREST (ex.: WHERE com função leaky que veria linhas filtradas).
--   * Owner DEVE permanecer postgres. NUNCA fazer `alter view ... owner to ...`.
-- ============================================================

create or replace view public.profiles_with_email
with (security_barrier = true)
as
  select p.*, u.email, u.last_sign_in_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  where (auth.uid() = p.id or public.is_admin());

grant select on public.profiles_with_email to authenticated;
```

### 2.2 Notas sobre o modelo

- **Enums envolvidos em DO blocks** — Postgres não suporta `create type if not exists`; o pattern `do $$ begin … exception when duplicate_object then null; end $$;` torna a migration idempotente (sobreviver a retry de CLI/Supabase rebuild).
- **Enum `client_status` definido completo desde já** (incluindo `rejeitado`) para evitar migrações de schema futuro.
- **`is_admin` na própria tabela** — Fase 1A só vai ter 1 admin (o Caio). Setar via SQL após primeiro signup (§2.3).
- **Telefone armazenado em E.164** (`+5511987654321`). Regex aceita DDDs 11-99 (sem zero inicial) + 8 ou 9 dígitos. Frontend exibe com máscara `+55 (11) 98765-4321` e parser tolera 4 formatos de input (E.164 puro, com máscara, só DDD+número, com/sem espaços) — normaliza para E.164 antes do Zod validar.
- **Validações de domínio em trigger** em vez de CHECK — `current_date` é STABLE e não pode ir em CHECK constraint sem warning/comportamento inesperado.
- **Floor de 18 anos no `profiles_validate_domain`** — LGPD Art. 14 exige consentimento parental específico para menores. Fase 1A não suporta esse fluxo, schema bloqueia. Zod no frontend espelha a regra (§7.3).
- **`handle_new_user` defensivo** — captura exceção em casts de date/enum, usa defaults seguros e, em último caso, faz `RAISE WARNING + return new` para que `auth.users` seja criado mesmo se metadata vier corrompida. O frontend detecta o profile órfão (useProfile retorna null) e mostra tela de erro com WhatsApp para Caio resolver manualmente. Isso evita travar signUp inteiro com mensagem de erro Postgres vazando schema pro cliente.
- **Validação de tipo de `dependentes`** — `jsonb_typeof(deps_json) = 'array'` antes de iterar; se vier objeto/null/escalar, usa `array[]::int[]` em vez de quebrar.
- **Proteção de colunas via trigger BEFORE UPDATE** — abordagem idiomática do Supabase, mais robusta que tentar congelar valores via subquery em WITH CHECK.
- **Ordem dos triggers BEFORE UPDATE** — Postgres executa em ordem alfabética do nome: `profiles_prevent_self_demote_trg` → `profiles_protect_columns_trg` → `profiles_set_updated_at` → `profiles_validate_domain_trg`. Isso é proposital: o anti-self-demote checa `auth.uid()` antes do `protect_columns` reverter, então um admin de boa fé recebe a mensagem de erro correta. Não renomear sem reavaliar.
- **`is_admin()` SECURITY DEFINER** — bypassa RLS dentro do corpo, evitando recursão na policy SELECT. Mudar para SECURITY INVOKER quebra isso.
- **`policy profiles_insert` é defesa em profundidade** — o caminho normal é via trigger SECURITY DEFINER `handle_new_user` (que bypassa RLS); a policy só dispara em fallback (ex: cliente cadastrou, trigger logou warning, profile órfão, frontend tenta INSERT manual via `supabase.from('profiles').insert(...)`). Bloqueia escalada ao impedir setar `is_admin=true` ou `status≠'lead'` por essa via.
- **View `profiles_with_email`** — necessária porque PostgREST não permite join em schema `auth` por default. Configurações:
  - `security_invoker = false` (default em PG 15+; equivale ao comportamento clássico de view executando com permissões do owner). Postgres views NÃO têm atributo `security_definer` — a opção é só `security_invoker = true|false`.
  - Filtro `where (auth.uid() = p.id or public.is_admin())` embutido espelha a RLS de profiles. **Esse filtro É a única camada de segurança da view.** Se for removido em refactor futuro, vaza email de todos os usuários para qualquer authenticated.
  - `security_barrier = true` impede vazamento via predicates leaky em PostgREST.
  - Owner deve permanecer `postgres` (a migration é executada nesse role); NUNCA `alter view ... owner to authenticated`.
  - `is_admin()` STABLE permite ao planner cachear o resultado dentro da query; com `security_barrier`, o `where is_admin = false` do PostgREST não é empurrado pra antes do filtro de segurança — mas o índice parcial `profiles_admin_list_idx` ainda deve ser usado quando o admin lista. Validar com `EXPLAIN ANALYZE` em smoke (caso 15 do §7.5).
- **`handle_new_user` whitelist de exceções** — só captura `invalid_text_representation`, `invalid_datetime_format` e `invalid_parameter_value` (formato de dados vindo de metadata corrompido). Demais exceções (check_violation, raise_exception do trigger validate_domain, bugs de schema) propagam e abortam o signUp — caso contrário mascaramos bugs reais como "profile órfão". O frontend detecta o caso whitelist (auth.users criado, profile null) e mostra OrphanProfileError; o caso não-whitelist é vivido como erro de signUp normal, com mensagem do trigger que abortou.
- **Trigger `profiles_prevent_last_admin_delete`** — pareado com runbook §4.4. Se Caio for único admin e for deletado via Studio, CASCADE vai disparar este BEFORE DELETE em profiles e abortar — força promoção de outro admin antes.
- **Exclusão real LGPD** requer deletar `auth.users` (cascateia profile via FK), com a ressalva de que a política de privacidade deixa claro que pedido do titular (Art. 18) prevalece sobre retenção declarada (item 6 da §3.10). Documentado no runbook (§4.4).
- **`dependentes int[]` é dívida conhecida** — sem ordenação garantida, sem dedup, sem parentesco. Fase 1B vai migrar para tabela `profile_dependentes` (id, idade, parentesco, ordem). Documentado em §8.

### 2.3 Setup pós-migration

**Recomendação:** Caio NÃO deve usar o cadastro do portal como admin. Em vez disso:

1. Criar um auth.user dedicado de admin via Supabase Studio:
   - Auth → Users → Add user
   - Email: `caio.gurgel.guerra@gmail.com` (ou email separado de admin)
   - Senha forte; marcar "Auto Confirm User" para pular email confirmation
2. No SQL Editor, criar manualmente a linha de profiles para esse usuário com `is_admin=true` e `status='liberado'`:

```sql
-- IMPORTANTE: data_nascimento real do Caio (não placeholder), porque o trigger
-- profiles_validate_domain exige >= 18 anos. UF = sigla de 2 letras válida.
-- A ordem (is_admin=true no INSERT) também evita que o webhook notify-new-lead
-- envie email "novo lead: Caio" — a Edge Function filtra is_admin === false.
insert into public.profiles (
  id, nome_completo, data_nascimento, estado_civil, dependentes,
  profissao, regime_trabalho, cidade, uf, telefone,
  status, is_admin
) values (
  (select id from auth.users where email = 'caio.gurgel.guerra@gmail.com'),
  'Caio Gurgel Guerra', '<DATA_NASC_REAL>'::date, 'solteiro', '{}',
  'Planejador Financeiro CFP', 'autonomo', '<CIDADE>', '<UF>', '<TELEFONE_E164>',
  'liberado', true
);
```

Isso evita que o admin apareça misturado na lista de clientes (a query do `/admin` também filtra `is_admin=false` — ver §4.1) e que o webhook `notify-new-lead` dispare para o próprio admin (filtro `record.is_admin === false` no payload — §5.3).

---

## 3. Auth e telas do cliente

### 3.1 Rotas

| Rota | Acesso | Componente |
|---|---|---|
| `/` (existente) | público | Home |
| `/aposentadoria` (existente) | público | AposentadoriaPage |
| `/salario` (existente) | público | SalarioPage |
| `/cadastro` | público (sem sessão ativa) | CadastroPage |
| `/login` | público (sem sessão ativa) | LoginPage |
| `/recuperar-senha` | público | RecuperarSenhaPage |
| `/redefinir-senha` | aguarda evento `PASSWORD_RECOVERY` | RedefinirSenhaPage |
| `/confirme-email` | público | ConfirmeEmailPage (pós-cadastro) |
| `/privacidade` | público | PrivacidadePage |
| `/termos` | público | TermosPage |
| `/conta-excluida` | público (sem sessão ativa, pós-exclusão) | ContaExcluidaPage |
| `/aguardando` | autenticado, `is_admin=false`, `status=lead` | AguardandoPage |
| `/liberado` | autenticado, `is_admin=false`, `status≠lead` | LiberadoPage |
| `/meus-dados` | autenticado, `is_admin=false`, qualquer status | MeusDadosPage |
| `/admin` | autenticado, `is_admin=true` | ListaClientesPage |
| `/admin/cliente/:id` | autenticado, `is_admin=true` | DetalheClientePage |

### 3.2 Guards e redirect

**Precedência:** `is_admin` SEMPRE tem precedência sobre `status`. Admin vai para `/admin` independente do status.

- `<RequireAuth>`: redireciona pra `/login?next=<rota_original>` se não houver sessão. Mostra spinner enquanto resolve sessão.
- `<RequireAdmin>`: rota só para admin; se não-admin, redireciona conforme tabela abaixo.
- `<RequireClient>`: rota só para não-admin; se admin, redireciona pra `/admin`.

**Sanitização do `next=` (anti open-redirect):** o parâmetro deve ser tratado como path relativo apenas. Antes de `navigate(next)`, validar:

```ts
function safeNext(raw: string | null): string {
  if (!raw) return '/';
  // Bloqueia URLs absolutas e protocol-relative ("//evil.com")
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  // Bloqueia tentativas com whitespace/CR/LF de injeção
  if (/[\s\\]/.test(raw)) return '/';
  return raw;
}
```

Caso de regressão coberto no smoke test (§7.7).

**Estados discretos do `useProfile` (discriminated union):**

```ts
type ProfileState =
  | { status: 'idle' }                              // sem session
  | { status: 'loading' }                           // carregando
  | { status: 'ready', profile: Profile }           // OK
  | { status: 'orphan' }                            // session existe, profile não (RAISE WARNING do handle_new_user)
  | { status: 'error', error: Error };              // network/PostgREST 5xx (não confundir com orphan)
```

Sem essa diferenciação, `RequireClient` precisaria heurística (`!loading && !profile && session`), o que é frágil em transições e mistura erro de rede com profile órfão real.

**Loading unificado para evitar duplo flash:** os layouts e guards mostram um único `<FullScreenSpinner />` enquanto `useAuth.status === 'loading'` ou `useProfile.status === 'loading'`. Estado `'error'` mostra `<ConnectionErrorScreen />` com botão "Tentar novamente"; estado `'orphan'` mostra `<OrphanProfileError />` (CTA WhatsApp + Sair).

**`<RequireGuest>` apenas em `/cadastro` e `/login`:** essas duas rotas não devem ser acessíveis a usuários autenticados — se houver sessão, redirecionar via tabela "redirect inteligente pós-login". Sem esse guard, um usuário logado que digite `/cadastro` na URL veria o form e poderia gerar estado inconsistente (signUp com sessão ativa). Implementação:

```tsx
function RequireGuest({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const profile = useProfile();
  if (auth.status === 'loading') return <FullScreenSpinner />;
  if (auth.status === 'authenticated') {
    return <Navigate to={smartRedirect(profile)} replace />;
  }
  return children;
}
```

**`/recuperar-senha` NÃO usa `RequireGuest`.** Cenário real: admin logado clica "Esqueci minha senha" no email recebido — se houvesse guard, seria redirecionado para `/admin` antes de poder digitar email. A página em si não causa estado inconsistente (só dispara `supabase.auth.resetPasswordForEmail`).

**`/redefinir-senha` NÃO usa `RequireGuest`.** A página entra com sessão de recovery transitória vinda do link no email; o `signOut({ scope: 'local' })` no `useEffect` (§3.8) limpa qualquer sessão pré-existente para evitar estado misto. Adicionar guard quebraria o fluxo.

**Profile órfão (recovery):** se `useProfile.status === 'orphan'` (auth.users criado, profile null por whitelist do `handle_new_user` em §2.1), o app mostra tela de erro com link para WhatsApp e botão "Sair". Não tenta auto-criar profile via `supabase.from('profiles').insert(...)` porque a policy `profiles_insert` exige `status='lead'` e isso poderia mascarar bugs reais. Caio resolve manualmente via runbook §4.4.

**Redirect inteligente pós-login** (LoginPage ou hook):

| `is_admin` | `status` | Destino |
|---|---|---|
| true | qualquer | `/admin` |
| false | `lead` | `/aguardando` |
| false | `rejeitado` | `/aguardando` (sem revelar recusa pela UI; Caio comunica externamente) |
| false | `liberado` ou superior | `/liberado` |

**Tabela completa de guards (rotas protegidas):**

| Tentativa | `is_admin` | `status` | Resultado |
|---|---|---|---|
| `/admin*` | true | qualquer | permitido |
| `/admin*` | false | qualquer | redirect via tabela "redirect inteligente" |
| `/aguardando` | true | qualquer | redirect `/admin` |
| `/aguardando` | false | `lead` ou `rejeitado` | permitido |
| `/aguardando` | false | `liberado`+ | redirect `/liberado` |
| `/liberado` | true | qualquer | redirect `/admin` |
| `/liberado` | false | `liberado`+ | permitido |
| `/liberado` | false | `lead` ou `rejeitado` | redirect `/aguardando` |
| `/meus-dados` | true | qualquer | redirect `/admin` |
| `/meus-dados` | false | qualquer | permitido |
| Qualquer rota protegida | sem sessão | — | `/login?next=<rota>` |

### 3.3 Cadastro (CadastroPage)

Formulário único com **9 campos pessoais + email + senha + confirmar senha**. Após submit:

```ts
await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${APP_URL}/login`,
    data: {
      nome_completo, data_nascimento, estado_civil, dependentes,
      profissao, regime_trabalho, cidade, uf, telefone
    }
  }
});
// Trigger Postgres on_auth_user_created cria a linha em profiles
// usando raw_user_meta_data. Cliente vai para /confirme-email.
```

Após sucesso, redireciona para `/confirme-email` com query string `?email=<email>` (para o botão "reenviar"). Em erro, mostra toast com mensagem da §7.1.

**Detecção de email duplicado:** Supabase com email confirmation ON tem comportamento anti-enumeration — `signUp` com email existente retorna `{ data: { user: { identities: [] } }, error: null }`. Frontend detecta `data.user?.identities?.length === 0` e mostra mensagem da §7.1.

> ⚠ **Hack version-dependent.** Esse comportamento de `identities: []` foi quebrado e restaurado várias vezes em releases do `@supabase/supabase-js` / `gotrue-js`. Para reduzir risco:
> - Travar versão exata do `@supabase/supabase-js` no `package.json` (sem caret).
> - Smoke test §7.7 inclui caso "cadastrar com email já existente → mostra mensagem". Se quebrar após upgrade, atualizar a heurística.
> - Defesa em profundidade: o trigger `handle_new_user` só roda no INSERT em `auth.users`; signUp em email existente não dispara INSERT, então não cria duplicata acidental.

**Auto-focus, progresso e draft (UX para form longo):**
- Auto-focus no campo "nome completo" no mount.
- Indicador visual "Etapa X de 12" no topo (visual leve; ainda é um único submit).
- Draft em `localStorage` chave `cadastro_draft_v1`: salva todos os campos exceto **senha**, **confirmar senha**, **`aceito_privacidade`** e **`aceito_transferencia_internacional`**. Persistir consentimentos seria tóxico LGPD (registro mostraria "aceito" repetido em reloads, fragilizando defesa em disputa de consentimento). Cliente reaceita a cada submit — fricção mínima, defesa robusta.
- **Formato com TTL:** `{ data: <campos>, savedAt: <epoch ms> }`. No load, descartar se `Date.now() - savedAt > 24*3600*1000` (24h). Reduz superfície de exposição em computador compartilhado e mitiga PII estagnada.
- Debounce 500ms ao salvar. Limpa após signUp bem-sucedido.

**Campos e tooltips pedagógicos** (memória `feedback_tooltips_pedagogicos`):

| Campo | Tipo | Tooltip | Validação Zod |
|---|---|---|---|
| Nome completo | text | "Como aparece no seu RG/CNH" | min 3, max 200 |
| Data de nascimento | date | "Usamos para projeções de aposentadoria. Cadastro disponível para maiores de 18 anos." | `<= today - 18y` (espelha trigger SQL) |
| Estado civil | select | "Influencia na proteção patrimonial e no planejamento sucessório" | enum |
| Dependentes (idades) | array dinâmico (max 10) | "Adicione filhos ou outros dependentes financeiros. As idades importam para projeção de educação e plano de saúde" | int 0-120, max 10 |
| Profissão | text | "Sua atividade principal — vai pra projeção de renda" | min 2, max 100 |
| Regime de trabalho | select | "CLT, PJ, autônomo etc. Define como calculamos seu líquido e benefícios" | enum |
| Cidade | text | "Influencia custo de vida considerado no plano" | min 2, max 100 |
| UF | select 27 estados | — | enum |
| Telefone | masked input | "Para te contatar caso o email falhe. Apenas números brasileiros" | E.164 BR (`/^\+55[1-9][1-9]\d{8,9}$/`) — **validação aplicada após PhoneInput normalizar para E.164**, não no input cru |
| Email | email | "Será seu login. Cuidado com typos — sem ele você não recebe os avisos" | `z.string().email()` |
| Senha | password | "Mínimo 8 caracteres. Use uma combinação que só você lembre" | min 8 |
| Confirmar senha | password | — | `match(senha)` |
| Aceito a [Política de Privacidade](/privacidade) | checkbox | (obrigatório, link com `target="_blank"` para não perder draft) | `z.literal(true)` |
| Concordo com transferência internacional dos meus dados para EUA (Supabase, Resend), conforme item 4 da Política | checkbox separado | "Necessário porque LGPD Art. 8 §4 exige consentimento específico e destacado para transferência internacional (Art. 33 IX). Sem concordância separada, só sobra Art. 33 V (execução de contrato) — que pode ser questionado em fase pré-pagamento." | `z.literal(true)` |

**Tooltips em mobile (touch + a11y correta):** hover não funciona em touch. Padrão correto:
- O ícone `(?)` é um `<button aria-expanded={open} aria-controls={popoverId}>` que toggle o popover ao tap (fecha ao tap fora).
- O `<input>` tem `aria-describedby={errorId}` apontando **só pro erro** (sempre).
- O conteúdo do popover NÃO é referenciado em `aria-describedby` do input — caso contrário, screen readers anunciam o tooltip toda vez que o input recebe foco (announce duplicado e ruidoso).
- Há um `<span className="sr-only">` curto (≤ 8 palavras) ao lado do label para usuários de screen reader que precisam da dica sem abrir popover.

**PhoneInput:** parser tolerante. Aceita 4 formatos no input — E.164 puro (`+5511987654321`), com máscara (`+55 (11) 98765-4321`), só DDD+número (`11 98765-4321`), com/sem espaços/parênteses. Antes de Zod validar, normaliza para E.164. Se inválido após normalização, exibe erro pedindo o formato esperado.

**DependentesInput:** array dinâmico com botão "Adicionar dependente" abaixo da lista. Limite max=10 (UX em mobile + cobre 99% dos casos reais). Cada linha: label "Dependente N — idade", input numérico, botão "Remover". Sem dependentes é o default. Quando atinge o limite, o botão fica disabled com texto contendo link clicável para WhatsApp (via `whatsappUrl('duvida_geral')`): *"Limite de 10 dependentes nesta etapa. Para mais, [fale comigo no WhatsApp](...)."*

**Campo honeypot anti-bot:** input invisível posicionado fora da viewport, NÃO `display:none` (que bots Puppeteer detectam):

```tsx
<input
  type="text"
  name="website"
  tabIndex={-1}
  autoComplete="off"
  aria-hidden="true"
  className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
/>
```

Se preenchido no submit, frontend rejeita silenciosamente (redireciona para `/`).

**Foco pós-submit (a11y):** após `signUp` bem-sucedido e `navigate('/confirme-email')`, a tela de destino move foco para `<h1 tabIndex={-1}>` no `useEffect` de mount. Aplica-se a todas as transições programáticas neste fluxo.

### 3.4 Tela /confirme-email (pós-cadastro)

**Importante — tela puramente estática.** Com email confirmation ON, `signUp` retorna sem sessão (`session=null`) e `auth.uid()` é `NULL` no servidor. A RLS de SELECT em `profiles` exige `auth.uid() = id OR is_admin()`, então qualquer chamada Supabase desta tela retorna vazio/erro. Por isso a página NÃO chama `useProfile`/`useAuth` nem qualquer query — lê apenas o email da query string `?email=` e renderiza estaticamente.

Texto:

> **Confirme seu email**
>
> Enviamos um link de confirmação para **${email}**. Clique nele para ativar sua conta.
>
> Não recebeu? Verifique a caixa de spam.
>
> [Reenviar email de confirmação] (botão — chama `supabase.auth.resend({ type: 'signup', email })`)
>
> Errou o email? Fale comigo no WhatsApp [link] que eu corrijo manualmente. (Caio deleta o auth.user e o cliente cadastra de novo — runbook §4.4)

**Cooldown do botão "Reenviar":** disabled por 60s após cada clique, com countdown visual ("Reenviar em 47s..."). Trata erro `over_email_send_rate_limit` do Supabase com toast: "Muitos pedidos. Aguarde alguns minutos e tente de novo." Sem isso, cliente clica 10x e gera 10 toasts de sucesso falso.

**Comunicação do email errado:** runbook §4.4 instrui Caio a (a) confirmar identidade via WhatsApp antes; (b) deletar o auth.user; (c) **avisar cliente via WhatsApp para refazer o cadastro com o email correto** — sem essa mensagem, cliente fica sem feedback.

### 3.5 Tela /aguardando

Para clientes com `status='lead'` ou `status='rejeitado'`. Texto base (sem promessa de SLA fixo):

> **Você está na fila!**
>
> Recebemos seu cadastro. Para garantir um atendimento de qualidade, eu (Caio Gurgel, planejador certificado pelo CFP) reviso pessoalmente cada cliente antes de liberar o onboarding.
>
> Vou revisar nos próximos dias úteis e te aviso por email quando o acesso estiver liberado.
>
> Se tiver dúvidas, fale comigo no WhatsApp: [link].
>
> [Corrigir meus dados](/meus-dados)

**Bloco extra** se `now() - created_at > 3 dias` (alinhado com o ciclo "próximos dias úteis"; antes era 5 dias mas o aviso ficava muito tardio):

> ⚠ Faz mais tempo do que o esperado. Por favor, fale comigo no WhatsApp para conferirmos. [link]

Botão de logout no header global. Em sessão multi-device, logout invalida globalmente — mostrar toast "Você foi desconectado de todos os dispositivos." (§3.9).

### 3.6 Tela /liberado (placeholder Fase 1A)

Para clientes com `status='liberado'` ou superior. Texto:

> **Acesso liberado em ${dataLiberacao}!**
>
> Em breve você poderá preencher os dados do seu planejamento aqui.
>
> Vou entrar em contato em breve via WhatsApp ou email para combinarmos os próximos passos. Se preferir, me chame: [WhatsApp].
>
> [Corrigir meus dados](/meus-dados)

`${dataLiberacao}` é derivado de `updated_at` do profile na transição para `liberado` (Fase 1A não tem coluna dedicada `liberado_at`; `updated_at` é a melhor aproximação enquanto não houver outras edições do admin pós-liberação. Marcar como dívida em §8 se virar problema). A UI real do wizard patrimonial entra na Fase 1B.

### 3.7 Tela /meus-dados

Form idêntico ao cadastro (sem email/senha/confirmação), pré-preenchido com os dados atuais do `profiles`. Cliente pode editar e salvar via UPDATE — RLS `profiles_update_self` + trigger `profiles_protect_columns` garantem que `status`, `is_admin` e `motivo_rejeicao` não mudem.

Botão "Voltar" volta para `/aguardando` ou `/liberado` conforme o status atual.

**Concorrência (last-write-wins):** se Caio estiver visualizando `/admin/cliente/:id` enquanto o cliente edita `/meus-dados`, o último UPDATE prevalece. Aceito como dívida na Fase 1A — Caio tipicamente atua sequencialmente. Marcar em §8 e revisar na Fase 1B com `If-Match`/`updated_at` check.

**Botão "Excluir minha conta" (LGPD Art. 18):** abaixo do form, com confirmação dupla via **`<ConfirmDialog>`** (wrapper sobre `@headlessui/react` `Dialog` — peer com Tailwind, ~5KB gz, traz foco trap, ESC para fechar e restore-focus prontos). Não usar `window.confirm`/`window.prompt` (`prompt` é parcialmente bloqueado em iOS Safari/WebView/PWA, retorna null silenciosamente).

- **Configuração para ação destrutiva:** `dismissOnOverlay={false}` (clicar no fundo NÃO fecha — defesa contra acidente), `closeOnEsc={true}`, foco inicial no botão **"Cancelar"** (default seguro).
- Modal 1: texto "Esta ação é irreversível. Excluiremos seu cadastro agora. Você receberá email de confirmação em até 15 dias úteis (LGPD Art. 18 §6)."
- Modal 2 (após "Continuar"): `<input>` controlado exige texto exato `EXCLUIR` (case-sensitive) para habilitar o botão final. ESC ou "Cancelar" → no-op.

**Implementação atômica via Edge Function `delete-own-account`** (não cliente direto):
- Por que: deletar `profiles` no client + `signOut` separado é não-atômico. Se signOut falhar (rede cair), cliente retorna num estado órfão real (auth.users vivo, profile deletado) e cai no `OrphanProfileError` por bug, não por exclusão.
- Edge Function valida JWT → confirma `caller.id === userId` (impede admin chamar pra outro id por essa rota; admin usa runbook §4.4) → com service_role, deleta `auth.users` (cascateia profile) → dispara email para `ADMIN_NOTIFICATION_EMAIL` ("Cliente <nome> solicitou exclusão LGPD em <data>") via Resend → retorna `{ ok: true }`.
- Frontend: ao receber `{ ok: true }`, faz `signOut({ scope: 'local' })` (já não há sessão válida do server-side, mas limpa storage), navega para `/conta-excluida` (tela final) e exibe:

> **Sua conta foi excluída.**
>
> Sua conta e seus dados foram removidos agora. Você receberá email de confirmação em até 15 dias úteis (LGPD Art. 18 §6).
>
> Em caso de dúvida, fale comigo no WhatsApp: [link].

- Trigger `profiles_prevent_last_admin_delete` não bloqueia (cliente comum não é admin).

### 3.8 Tela /redefinir-senha

Componente espera o evento `PASSWORD_RECOVERY` via `onAuthStateChange` antes de mostrar o formulário. Antes de aguardar, faz `signOut({ scope: 'local' })` para limpar qualquer sessão preexistente (caso o cliente já estivesse logado em outra aba) e evitar estado misto. Comportamento:

```ts
useEffect(() => {
  // Limpa sessão local para não misturar com a sessão de recovery que vai chegar
  void supabase.auth.signOut({ scope: 'local' });

  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') setReady(true);
  });
  // 8s para tolerar conexões 3G brasileiras (3s era frágil em rede lenta)
  const t = setTimeout(() => {
    if (!ready) setError('Link inválido ou expirado.');
  }, 8000);
  return () => { data.subscription.unsubscribe(); clearTimeout(t); };
}, [ready]);
```

Submit chama `supabase.auth.updateUser({ password })`. **Após sucesso, chama `supabase.auth.signOut()` (escopo global)** — invalida sessões em todos os devices e força novo login com a senha nova como prova de posse. Redireciona para `/login`. Trocar para `scope: 'others'` aqui era bug: o cliente continuava com a sessão atual e o "redirect inteligente" ao chegar em `/login` o jogaria pra `/aguardando`/`/liberado` antes de revalidar a senha.

**Reset de senha em conta não confirmada:** Supabase Auth (gotrue v2.x+) marca automaticamente `email_confirmed_at` após `updateUser` em fluxo de recovery — comportamento documentado, não há setting "Confirm email on password reset" no painel. Validado no smoke test (§7.7) com cadastro → recuperar senha sem confirmar email → confirma que login passa após reset.

### 3.9 Logout

Botão no header global de rotas autenticadas. Implementação:

```ts
await supabase.auth.signOut();   // escopo 'global' por default — invalida sessão em todos os devices
toast.info('Você foi desconectado de todos os dispositivos.');
navigate('/');
```

Disponível em `/aguardando`, `/liberado`, `/meus-dados`, `/admin`, `/admin/cliente/:id`. O toast comunica ao usuário que sessões em outros devices também foram encerradas — antes era silencioso.

### 3.10 Política de privacidade (`/privacidade`)

Texto LGPD-compliant para Fase 1A. **Versão 1 — última atualização lida da constante `POLICY_LAST_UPDATED` em `src/lib/legal/version.ts`** (não hardcoded no JSX, evita texto desatualizado quando deploy for em outra data).

> **Política de Privacidade — Seu Mapa Financeiro**
>
> *Versão 1 — Última atualização: ${POLICY_LAST_UPDATED}*
>
> **1. Controlador.** Caio Gurgel Guerra (CPF fornecido a autoridade competente sob solicitação formal), planejador financeiro CFP®, é o controlador dos dados pessoais tratados pela plataforma `meumapafinanceiro.ia.br`. Quando aplicável, o regime societário será atualizado neste item (PF autônoma, ME ou LTDA) com CNPJ correspondente.
>
> Encarregado de Proteção de Dados (DPO): o próprio controlador, contato `caio.gurgel.guerra@gmail.com`. Em caso de **ausência temporária** (férias, afastamento curto), as solicitações continuarão a ser recebidas e o prazo de resposta do item 6 conta a partir do retorno do controlador, com auto-resposta automática informando o prazo estendido. Para incapacidade prolongada, ver item 9.
>
> **2. Quais dados coletamos e por quê.**
> | Categoria | Dados | Finalidade | Base legal (LGPD Art. 7º) |
> |---|---|---|---|
> | Identificação | Nome, data de nascimento, estado civil, dependentes (idades) | Caracterização do cliente, projeções e simulações | V — execução de contrato/tratativas pré-contratuais |
> | Profissional | Profissão, regime de trabalho | Avaliação de renda e benefícios | V — execução de contrato |
> | Localização | Cidade, UF | Custo de vida regional para o plano | V — execução de contrato |
> | Contato | Telefone, email | Comunicação direta sobre o planejamento; envio de emails transacionais | V — execução de contrato; IX — legítimo interesse para email transacional |
> | Acesso | Endereço IP, registros de login | Segurança e auditoria (logs Supabase, retenção ~30 dias) | IX — legítimo interesse em segurança *(LIA documentado em `docs/legal/lia-ip-logs.md`)* |
>
> *Em viewports estreitos (mobile), esta tabela é renderizada como `<dl>` empilhado para legibilidade.*
>
> Não usamos cookies não-essenciais (analytics, marketing). Usamos `localStorage` técnico para:
> - Manter sua sessão logada (chaves do Supabase Auth, sob seu controle).
> - Salvar rascunho do cadastro (chave `cadastro_draft_v1`) com os dados pessoais até o envio bem-sucedido. **Não armazenamos a senha nem o aceite da Política nesta chave.** Você pode limpar manualmente em qualquer momento via console do navegador ou função "Limpar dados do site".
>
> **3. Cadastro restrito a maiores de 18 anos.** Não tratamos dados de menores de 18 anos nesta fase. Em caso de cadastro de menor (raro pela validação técnica), o registro é deletado e o consentimento parental específico (LGPD Art. 14) terá que ser implementado em fase futura.
>
> **4. Operadores e transferência internacional.** Compartilhamos dados estritamente com operadores essenciais à operação:
> - **Supabase Inc.** (US-East) — hospedagem do banco e autenticação. Operador sob LGPD via DPA padrão Supabase aceito pelo controlador.
> - **Resend, Inc.** (US) — envio de emails transacionais. Operador sob LGPD via DPA padrão Resend aceito pelo controlador.
>
> Os dois implicam **transferência internacional de dados** para os Estados Unidos (LGPD Art. 33). Base legal aplicada:
> - **Art. 33, V (principal)** — necessário à execução de contrato ou diligências pré-contratuais a pedido do titular: a hospedagem em Supabase é condição operacional indispensável para criar e manter sua conta; o envio via Resend é condição para você receber confirmações de cadastro e avisos sobre o serviço.
> - **Art. 33, IX (reforço)** — consentimento específico e em destaque do titular: no cadastro, há checkbox próprio "Concordo com transferência internacional dos meus dados para EUA (Supabase, Resend) conforme item 4 desta Política", separado do checkbox de aceite geral da Política. Atende LGPD Art. 8 §4 (consentimento específico e destacado por finalidade).
>
> *Cláusulas contratuais aprovadas pela ANPD (Art. 33, VIII): a ANPD ainda não publicou o conjunto definitivo (Resolução CD/ANPD 19/2024 está em consulta). Quando publicado, os DPAs serão revisados conforme. Hoje, os DPAs Supabase/Resend usam cláusulas-padrão SCCs (GDPR), reconhecidas internacionalmente como salvaguarda equivalente.*
>
> **5. Armazenamento.** Servidores com criptografia em repouso (Supabase Postgres) e em trânsito (TLS 1.2+). Senhas armazenadas via hash bcrypt pelo Supabase Auth.
>
> **6. Seus direitos (LGPD Art. 18).** Você pode, gratuitamente, solicitar:
> - Confirmação da existência do tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informação sobre compartilhamento, revogação de consentimento.
> - **Canal eletrônico:** `caio.gurgel.guerra@gmail.com` (assunto: "LGPD — direito do titular"). Responderemos em até **15 dias úteis**.
> - **Correção dos próprios dados:** disponível diretamente em **Meus dados** após login.
> - **Exclusão da conta:** disponível em **Meus dados → Excluir minha conta** (a deleção do email/login é completada pelo controlador conforme runbook interno; você recebe confirmação por email).
>
> **7. Retenção.** Mantemos seus dados enquanto a relação consultiva estiver ativa. Após encerramento, conservamos pelos prazos legais aplicáveis ao regime do controlador, dentre eles:
> - **Tributário/Fiscal:** prazos do Decreto 70.235/72 e legislação correlata (até 5 anos a partir do exercício seguinte).
> - **Cobranças/relações de consumo:** prazo prescricional do Código Civil (Art. 206 §5º I — 5 anos para dívidas líquidas) e CDC.
> - **Obrigações regulatórias profissionais:** Resolução CVM 178/2023 (quando aplicável ao regime de atuação) e orientações Planejar/Anbima enquanto vinculantes por contrato com a entidade certificadora.
>
> **A solicitação de exclusão pelo titular (item 6) prevalece sobre este prazo de retenção, exceto quando houver dever legal específico de guarda** — nesses casos, comunicaremos a base legal aplicável e o prazo restante.
>
> **8. Incidentes de segurança.** Em caso de incidente que possa acarretar risco aos titulares, notificaremos a ANPD e os titulares afetados, em prazo razoável conforme orientação da ANPD (Resolução CD/ANPD nº 15/2024).
>
> **9. Sucessão.** Em caso de incapacidade ou falecimento do controlador, a base de dados será preservada apenas pelo tempo necessário para encerramento ordenado das relações ativas e exclusão segura, em conformidade com a LGPD.
>
> **10. Versionamento.** Esta política pode ser atualizada. A versão vigente fica em `/privacidade` com data de "Última atualização" no topo. Versões anteriores são preservadas para auditoria — solicitar via item 6.
>
> **11. Limites do serviço.** A consultoria via Seu Mapa Financeiro é **planejamento financeiro pessoal** prestado por profissional certificado CFP®. **Não constitui recomendação de produto de investimento (CVM 178/2023)** e não substitui assessoria de valores mobiliários. Detalhes em [Termos de Uso](/termos).
>
> Em caso de dúvidas: `caio.gurgel.guerra@gmail.com`.

⚠ **Estratégia de publicação (interno — não vai pra `/privacidade`):**

A versão acima é "Versão 1" pública, sem badge "draft" — publicar texto com selo de "em revisão" cria auto-incriminação em fiscalização ANPD. Em vez disso, antes do go-live:

1. Caio confirma com advogado próprio (a) base legal de execução de contrato pré-pagamento (Art. 7º V), (b) DPAs Supabase/Resend assinados, (c) regime societário (item 1 CNPJ se PJ; item 7 fundamentação aplicável), (d) item 11 se for atuar sob CVM 178/2023.
2. Aplicar ajustes do advogado no texto.
3. Atualizar `POLICY_LAST_UPDATED` para a data da publicação final.
4. Só então fazer deploy do `/privacidade` em produção.

Enquanto a aprovação não vier, manter `/privacidade` como rota pública mostrando a versão acima é aceitável **se e somente se** os bloqueadores do A.1 já forem resolvidos. Caso contrário, considerar (a) feature flag escondendo `/privacidade` (rota responde 404) e bloqueando cadastro até aprovação, ou (b) desenvolvimento em ambiente de staging até liberação.

### 3.11 Footer global

Adicionar footer mínimo em todas as páginas (rotas públicas e autenticadas):

```
© 2026 Seu Mapa Financeiro · Caio Gurgel Guerra, CFP®
Reg. Planejar nº <NUMERO_PLANEJAR>
[Política de Privacidade](/privacidade) · [Termos de Uso](/termos) · WhatsApp: [link]
```

- `<NUMERO_PLANEJAR>`: número de registro CFP no Planejar, em linha separada conforme orientação da marca ("Caio Gurgel Guerra, CFP®" + "Reg. Planejar nº XXXXX"). Bloqueador externo no checklist A.1.
- `/termos`: nova rota mínima na Fase 1A (também placeholder até confirmação com advogado), contendo escopo do serviço, foro, limitação de responsabilidade e disclaimer CVM 178. Sem `/termos`, footer só com privacidade é insuficiente para serviço pago.
- Se Caio atuar como PJ (LTDA ou ME — MEI **não** é permitido para CNAE 6920-6/01), incluir CNPJ ao lado do nome.

---

## 4. Admin minimalista

### 4.1 `/admin` — Lista de clientes (ListaClientesPage)

Tabela simples (sem paginação na Fase 1A — esperamos < 100 clientes):

| Nome | Email | Status | Cadastrado em | Última atividade | Ações |
|---|---|---|---|---|---|
| João Silva | joao@... | lead | 06/05/2026 | 06/05 14:32 | [Liberar] [Recusar] [Detalhes] |
| Maria Costa | maria@... | em_consultoria | 03/05/2026 | 07/05 09:10 | [Detalhes] |

**Query base** (via view `public.profiles_with_email` — PostgREST não permite join direto em `auth.users`):
```ts
supabase.from('profiles_with_email')
  .select('id, nome_completo, status, motivo_rejeicao, created_at, email, last_sign_in_at')
  .eq('is_admin', false)
  .order('created_at', { ascending: false });
```

A view `profiles_with_email` (definida em §2.1) usa `security_invoker = false` (default) com filtro embutido `where (auth.uid() = p.id or public.is_admin())` — comportamento equivalente à RLS de `profiles`: admin vê todos, cliente comum só vê o próprio. NÃO usa `security_invoker = true` porque exigiria GRANT em `auth.users` para `authenticated`, o que vazaria email.

**Filtros:** select de status no topo (todos / lead / rejeitado / liberado / em_onboarding / submetido / em_consultoria / concluido). Estado local, sem persistência em URL.

**Busca:** input "Buscar por nome ou email" com debounce 300ms. Filtro client-side enquanto a lista cabe em memória (< 500 linhas — esperamos ≪ 100 na 1A). Quando ultrapassar, mover para `.ilike('nome_completo', `%${q}%`)` server-side.

**Detecção de duplicados:** badge laranja "possível duplicado de <Nome>" quando dois leads têm o mesmo telefone OU `(nome_completo, data_nascimento)`. Implementação client-side a partir do payload já carregado (evita self-JOIN no SQL — barato com < 100 linhas).

**Botão "Liberar":**
- Aparece apenas para `status='lead'`
- Estado loading+disabled durante a chamada
- Chama Edge Function `release-client(clientId)` que faz tudo atomicamente (validar admin, UPDATE com guard de idempotência, disparar email)
- Toast "Cliente liberado. Email enviado." em sucesso
- Toast "Cliente já liberado anteriormente" se a função retornar `alreadyReleased`

**Botão "Recusar":**
- Aparece apenas para `status='lead'`
- Modal `confirm()` nativo (workflow leve): "Recusar <nome>? Motivo (obrigatório):" + prompt — em produção real trocar por modal Tailwind com textarea
- UPDATE direto: `update profiles set status='rejeitado', motivo_rejeicao=$motivo where id=$id and status='lead'`
- **Sem email automático.** Caio decide se/como comunicar via WhatsApp.

**Responsividade:**
- `≥ md` (768px): tabela completa.
- `< md`: cards empilhados (uma "linha" da tabela = um card com nome em destaque, email/status/data em chips, ações na base). Tabela de 6 colunas em 375px é inutilizável.

### 4.2 `/admin/cliente/:id` — Detalhe (DetalheClientePage)

Mostra todos os campos do `profiles` em modo leitura, agrupados em seções:
- Identificação (nome, email, telefone)
- Dados pessoais (data nasc, idade calculada, estado civil, dependentes, profissão, regime)
- Endereço (cidade, UF)
- Status e timestamps (status, motivo_rejeicao se houver, created_at, updated_at, last_sign_in_at)

Sem edição administrativa na Fase 1A (cliente edita pelo `/meus-dados`). Botão "Voltar" para `/admin`.

**Dívida conhecida:** sem campo de anotação livre do consultor (ex: "conversamos no WhatsApp dia X"). Decidido fora da Fase 1A; documentado em §8 e movido para Fase 1B com tabela `consultor_notes` (FK para profile, com timestamps e RLS admin-only).

### 4.3 Acesso

Setado via SQL no setup inicial (§2.3). Nenhuma UI para gerenciar admins na Fase 1A.

### 4.4 Runbook operacional

Procedimentos manuais que o admin executa fora da UI. **Registro de operações (LGPD Art. 37):** Caio mantém uma planilha privada `lgpd-registro-operacoes.{xlsx,gsheet}` com colunas obrigatórias `data | titular_id | tipo_operacao | base_legal | evidencia | observacao`. Toda ação executada no runbook é registrada. Localização e backup ficam no Drive privado de Caio.

**LIA (Legitimate Interest Assessment) para IP/logs:** documento `docs/legal/lia-ip-logs.md` (mantido junto a este spec) cobre as 3 perguntas exigidas pela orientação ANPD para legítimo interesse: (1) necessidade — IP/logs são imprescindíveis para detectar tentativas de acesso indevido e investigar incidentes; (2) balanceamento — uso restrito a segurança, retenção curta (~30 dias), sem profiling; (3) expectativa do titular — declarado expressamente na política §3.10 item 2.

**Cliente pede exclusão dos dados (LGPD Art. 18):**

*Caminho A — cliente usa botão "Excluir minha conta" em `/meus-dados`:* a Edge Function `delete-own-account` (§5.4.1) já fez tudo atomicamente — auth.users e profile deletados via service_role, **2 emails automáticos** disparados (confirmação ao titular Art. 18 §6 + notificação a `ADMIN_NOTIFICATION_EMAIL` para auditoria). Caio só precisa:
1. Verificar email recebido e registrar na planilha (`tipo_operacao=eliminacao_titular_self_service, base_legal=Art.18`).
2. **Se NÃO receber o email "Cliente solicitou exclusão" em até 1h após cliente clicar**, é sinal de falha no Resend — investigar via Edge Function logs (a deleção em si NÃO é desfeita, só a notificação).

*Caminho B — cliente pede por canal externo (email/WhatsApp):*
1. Confirmar identidade respondendo do email cadastrado (não outro canal — evita engenharia social).
2. Supabase Studio → Auth → Users → deletar o usuário (cascateia profile via FK).
3. **Trigger `profiles_prevent_last_admin_delete` aborta se o titular for admin único** — promover outro admin antes (ver "Admin perdeu acesso").
4. Responder ao cliente confirmando exclusão dentro de 15 dias úteis (prazo do Art. 18 §6).
5. Registrar na planilha de operações Art. 37: `tipo_operacao=eliminacao_titular_externo, base_legal=Art.18`.

**Ausência temporária do encarregado (férias, afastamento curto):**
1. Configurar auto-resposta no email `caio.gurgel.guerra@gmail.com` informando: prazo de retorno, contato de emergência (sucessor designado, ver "Sucessão"), prazo do Art. 18 corre do retorno.
2. Para urgências de incidente de segurança Art. 48, sucessor pode acionar o procedimento de incidente sem aguardar retorno do controlador.

**Cliente digitou email errado no cadastro:**
1. Cliente entra em contato via WhatsApp.
2. Confirmar identidade pelos dados pessoais (nome + data de nascimento + cidade) que o cliente informou no cadastro errado — Caio busca por nome no `/admin` para conferir.
3. Avisar cliente via WhatsApp: "Vou apagar o cadastro com o email errado, pode refazer com o email correto em seguida."
4. Supabase Studio → Auth → Users → deletar o usuário (cascateia profile).
5. Confirmar com cliente via WhatsApp que pode refazer.
6. Registrar na planilha: `tipo_operacao=correcao_email_via_recadastro`.

**Lead parado em `lead` há mais de 3 dias úteis:**
1. UI mostra warning para o cliente em `/aguardando` (§3.5).
2. Caio revê a lista filtrada por `status=lead` no `/admin` ordenada por `created_at` ascendente (mais antigos primeiro).
3. Decidir liberar ou recusar manualmente; em caso de inatividade prolongada (> 14 dias úteis sem resposta), recusar com `motivo_rejeicao='lead inativo'` para limpar a fila.

**Admin perdeu acesso** (improvável com trigger anti-self-demote, mas possível via SQL direto ou se um segundo admin existir e remover o primeiro):
1. Supabase Studio → SQL Editor:
   ```sql
   update public.profiles set is_admin = true
   where id = (select id from auth.users where email = '<email_admin>');
   ```

**Cliente menor de 18 anos identificado** (caso o trigger `profiles_validate_domain` falhe ou date input venha errado):
1. Identificar via `/admin/cliente/:id` ou query `select id, data_nascimento from profiles where data_nascimento > current_date - interval '18 years'`.
2. Notificar via email cadastrado: "Identificamos que você não atingiu 18 anos; vamos remover seu cadastro conforme nossa Política de Privacidade item 3."
3. Supabase Studio → Auth → Users → deletar usuário.
4. Registrar na planilha: `tipo_operacao=eliminacao_menor_idade, base_legal=LGPD_Art.14`.

**Incidente de segurança (data breach — LGPD Art. 48):**
1. **Em até 2h:** isolar o vetor (revogar API keys comprometidas, desabilitar conta admin, etc.). Documentar timeline (`início_estimado`, `detecção`, `contenção`).
2. **Em até 24h:** mapear escopo (titulares afetados, categorias de dados, risco potencial). Consultar logs Supabase Auth e logs de Edge Functions.
3. **Em até 2 dias úteis:** notificar ANPD via formulário no portal `gov.br/anpd` (Resolução CD/ANPD nº 15/2024). Notificar titulares afetados por email.
4. Registrar na planilha: `tipo_operacao=incidente_seguranca` + criar relatório separado em `lgpd-incidente-YYYYMMDD.md` (timeline, dados afetados, ação tomada, comunicações).
5. Pós-incidente: revisar políticas de acesso, rotacionar todos os secrets (`RESEND_API_KEY`, `WEBHOOK_SECRET`), documentar lições aprendidas.

**Sucessão / incapacidade do controlador:**
1. Caio mantém em local seguro (cofre digital com sucessores designados) credenciais de acesso administrativo: Supabase, EasyPanel, Resend, Cloudflare/registro.br, GitHub, conta Google.
2. Em caso de incapacidade temporária ou definitiva, sucessor designado:
   - Comunica titulares por email sobre o evento e sobre o encerramento ordenado.
   - Aguarda janela de 30 dias para que titulares solicitem exclusão ou portabilidade.
   - Após janela, executa exclusão geral em conformidade com retenção legal mínima (5 anos para registros contábeis, conforme política §3.10 item 7).
3. Documento de sucessão privado fora deste repo, mantido pelo controlador.

---

## 5. Emails transacionais (Resend)

### 5.1 Inventário

| # | Email | Disparo | Quem recebe | Mecanismo |
|---|---|---|---|---|
| 1 | Confirmação de cadastro | Supabase Auth (built-in) | Cliente | Template Supabase customizado em PT-BR |
| 2 | Reset de senha | Supabase Auth (built-in) | Cliente | Template Supabase customizado em PT-BR |
| 3 | Novo lead cadastrou | Database Webhook AFTER INSERT em profiles → Edge Function `notify-new-lead` | Caio | Resend |
| 4 | Acesso liberado | Edge Function `release-client` (chamada do admin) | Cliente | Resend |
| 5 | Cliente solicitou exclusão LGPD | Edge Function `delete-own-account` (chamada do cliente em /meus-dados) | Caio | Resend |

### 5.2 Templates Supabase (1 e 2)

Customizar no painel Supabase → Auth → Email Templates. Bloco de assinatura padronizado em todos os emails para coerência de marca.

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
>
> —
> Caio Gurgel Guerra, CFP®
> Seu Mapa Financeiro · meumapafinanceiro.ia.br

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
>
> —
> Caio Gurgel Guerra, CFP®
> Seu Mapa Financeiro · meumapafinanceiro.ia.br

### 5.3 Edge Function: `notify-new-lead`

Arquivo: `supabase/functions/notify-new-lead/index.ts`

**Disparo:** **Database Webhook do Supabase** (Database → Webhooks) configurado em `AFTER INSERT` na tabela `profiles`. Webhook envia POST com header `x-webhook-secret: $WEBHOOK_SECRET` (nome do header configurado no painel — mesmo nome aqui) e payload contendo a row inserida em `record`.

**Por que webhook em vez de chamada do frontend:** o frontend pode falhar (aba fechada, sem rede) entre o trigger e a chamada. Webhook do Postgres é confiável e idempotente por design.

**Limitação conhecida:** Database Webhooks usam `pg_net.http_post` que é fire-and-forget — sem retry no Postgres. Se a Edge Function der 5xx ou Resend cair, ninguém é notificado (§7.9 trata isso com cron de auditoria).

**Validação (timing-safe):**
- Header `x-webhook-secret` igual a `WEBHOOK_SECRET` (env var) — comparação via `crypto.timingSafeEqual` para evitar timing attacks. Comprimentos diferentes → 401 imediato.
- `record.is_admin === false` (não notifica criação de admin — alinhado com setup §2.3 que cria admin com `is_admin=true` no INSERT).
- `record.status === 'lead'` (defesa em profundidade; INSERTs sempre criam com `status='lead'` por default, mas se algum dia mudar a convenção esse filtro evita notificações erradas).

```ts
// Deno (Edge Function) — timingSafeEqual NÃO existe no Web Crypto API (`crypto.subtle`);
// usar do `node:crypto`, que está disponível no runtime do Supabase Functions.
import { timingSafeEqual } from 'node:crypto';

const enc = new TextEncoder();
const got = enc.encode(req.headers.get('x-webhook-secret') ?? '');
const want = enc.encode(Deno.env.get('WEBHOOK_SECRET')!);
// Comprimentos diferentes: 401 imediato (não chama timingSafeEqual, que exige iguais).
if (got.length !== want.length || !timingSafeEqual(got, want)) {
  return new Response('unauthorized', { status: 401 });
}
```

**Obtenção do email do lead** (não está no payload):
```ts
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const { data: u, error } = await admin.auth.admin.getUserById(record.id);
const email = u?.user?.email ?? '<email indisponível>';
```
`auth.admin.getUserById` é o método canônico do Supabase Admin SDK. NÃO tentar `from('auth.users').select(...)` — `auth` não é exposto pelo PostgREST por default.

**Email:**
- **De:** `Seu Mapa Financeiro <noreply@meumapafinanceiro.ia.br>`
- **Para:** `ADMIN_NOTIFICATION_EMAIL` (env var)
- **Assunto:** `Novo lead: ${record.nome_completo}`
- **Body html + text** (Resend aceita ambos; clientes antigos como Outlook renderizam melhor com `text/plain` de fallback):
  > Novo lead cadastrado no Seu Mapa Financeiro.
  >
  > **Nome:** ${record.nome_completo}
  > **Email:** ${email}
  > **Cidade/UF:** ${record.cidade}/${record.uf}
  >
  > Acesse o painel admin para revisar: ${APP_URL}/admin

**Resposta:** sempre HTTP 200 — falha de Resend é logada via `console.error` (vai para Supabase Edge Function Logs) mas não propaga para o webhook (que não retentaria de qualquer jeito). O cron de auto-auditoria (§7.9) cobre o caso de email perdido.

### 5.4 Edge Function: `release-client`

Arquivo: `supabase/functions/release-client/index.ts`

**Disparo:** chamada do frontend admin com header `Authorization: Bearer <user_jwt>` e payload `{ clientId: uuid }`.

**CORS:** Edge Function chamada do browser exige preflight + headers em **TODAS** as respostas (200, 401, 403, 500). Sem CORS no body, browser bloqueia leitura mesmo com UPDATE bem-sucedido — frontend admin recebe erro de rede, toast de sucesso nunca dispara.

```ts
const ALLOWED_ORIGIN = Deno.env.get('APP_URL'); // https://www.meumapafinanceiro.ia.br
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN ?? '',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Vary': 'Origin',
};

// Helper que sempre injeta CORS — usar em TODOS os returns.
function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
```

Cada `return` da função usa `respond(...)`: `respond({ error: 'unauthorized' }, 401)`, `respond({ error: 'forbidden' }, 403)`, `respond({ ok: true, alreadyReleased: true })`, etc.

**Algoritmo:**
1. **Validar JWT.** `const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: req.headers.get('Authorization')! } } });` → `const { data: { user } } = await supabaseUser.auth.getUser()`. Se `null` → 401.
2. **Re-derivar `is_admin`** via `service_role` (não confiar em claims do JWT, pois um admin rebaixado pode ainda ter token válido):
   ```ts
   const admin = createClient(
     Deno.env.get('SUPABASE_URL')!,
     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!  // auto-injetada em Edge Functions
   );
   const { data: callerProfile } = await admin
     .from('profiles').select('is_admin').eq('id', user.id).single();
   if (!callerProfile?.is_admin) return respond({ error: 'forbidden' }, 403);
   ```
   Dívida conhecida: cada chamada faz round-trip ao banco. OK na 1A (1 admin, baixo volume); revisitar se virar gargalo.
3. **UPDATE com guard de idempotência** (atomic, sem race):
   ```ts
   const { data: updated } = await admin
     .from('profiles')
     .update({ status: 'liberado' })
     .eq('id', clientId)
     .eq('status', 'lead')
     .select('id, nome_completo')
     .maybeSingle();  // null se nada matchou (idempotente)
   ```
4. Se `updated === null` (cliente já não estava `lead`): retorna `{ ok: true, alreadyReleased: true }` sem chamar Resend.
5. Se `updated` tem linha: obter email via `admin.auth.admin.getUserById(clientId)` (NÃO do payload — defesa contra IDOR/email injection). Chamar Resend. Retorna `{ ok: true, emailSent: <bool> }`.
6. Falha de Resend não desfaz UPDATE — loga e retorna `emailSent: false`. Cliente fica liberado mesmo sem email; Caio acompanha pelo `/admin` ou avisa via WhatsApp.

**Try/catch global** envolvendo todo o algoritmo (passos 1–6):
```ts
try {
  /* ... 1-6 ... */
} catch (e) {
  console.error('release-client exception:', e);
  return respond({ error: 'internal' }, 500);
}
```
Sem isso, exceção não-capturada vira 500 sem CORS → frontend só vê "erro de rede" mesmo com UPDATE bem-sucedido (e o admin re-clica achando que falhou — idempotência cobre, mas UX é ruim).

**Frontend (admin) — UX dos toasts:**
- `{ ok: true, emailSent: true }` → "Cliente liberado. Email enviado."
- `{ ok: true, emailSent: false }` → "Cliente liberado, mas o email falhou. Avise por WhatsApp."
- `{ ok: true, alreadyReleased: true }` → "Cliente já estava liberado (email pode ter sido enviado anteriormente)." — texto explícito sobre a ambiguidade do timeout (UPDATE pode ter rodado, frontend timeout antes do retorno; próximo clique vê este estado).
- `{ error: 'internal' }` (status 500) → "Erro interno. Tente novamente em instantes."

**Email "Acesso liberado":**
- **De:** `Seu Mapa Financeiro <noreply@meumapafinanceiro.ia.br>`
- **Para:** email do cliente (derivado do banco via `auth.admin.getUserById`, NUNCA do payload)
- **Assunto:** Seu acesso foi liberado — Seu Mapa Financeiro
- **Body html + text** (ambos no Resend `send`):
  > Olá, ${nome_completo}!
  >
  > Seu acesso foi liberado. Em breve entraremos em contato para combinarmos os próximos passos.
  >
  > Acesse o portal: ${APP_URL}/login
  >
  > Este é um email transacional, parte da execução do serviço. Não é oferta nem recomendação de produto financeiro (ver Termos de Uso: ${APP_URL}/termos).
  >
  > —
  > Caio Gurgel Guerra, CFP®
  > Seu Mapa Financeiro · meumapafinanceiro.ia.br

**Sobre `nome_completo` no email:** vem do RETURNING do UPDATE, ou seja, valor corrente no momento da liberação. Se o cliente editou o nome em `/meus-dados` entre cadastro e liberação, o email usa o nome atualizado — comportamento esperado.

### 5.4.1 Edge Function: `delete-own-account`

Arquivo: `supabase/functions/delete-own-account/index.ts`

**Disparo:** chamada do frontend cliente (após confirmação dupla em `/meus-dados`, §3.7) com header `Authorization: Bearer <user_jwt>`. Sem payload — o `userId` é derivado do JWT, NÃO aceito do client (impede admin chamar pra outro id; admin usa runbook §4.4 caminho B).

**CORS:** mesmo padrão do `release-client` (origin restrito, headers em todas as respostas).

**Algoritmo:**
1. Validar JWT com `supabaseUser.auth.getUser()`. Se inválido → `respond({ error: 'unauthorized' }, 401)`.
2. Com `service_role`, ler `nome_completo` e `email` do profile (para os 2 emails).
3. Com `service_role`, deletar via `admin.auth.admin.deleteUser(user.id)` — cascateia profile via FK. Tratamento de erro:
   - Se erro contém indicador de `last_admin` (trigger `profiles_prevent_last_admin_delete` abortou — defesa em profundidade, normalmente impossível para cliente comum) → `respond({ error: 'cannot_delete_last_admin' }, 409)` com mensagem amigável no frontend.
   - Outros erros → propagam para o `try/catch` global (passo 6).
4. **Disparar 2 emails em paralelo via Resend** (corta passo manual sujeito a esquecimento):
   - **Email para o titular** (confirmação Art. 18 §6):
     - **Para:** `${email}`
     - **Assunto:** `Sua conta foi excluída — Seu Mapa Financeiro`
     - **Corpo:**
       > Olá, ${nome_completo}!
       >
       > Confirmamos que sua conta no Seu Mapa Financeiro foi excluída em ${timestamp}, conforme seu pedido (LGPD Art. 18).
       >
       > Os dados pessoais associados (cadastro, registros de autenticação) foram removidos dos nossos sistemas. Backups técnicos podem reter cópias residuais por até 30 dias antes da rotação automática, conforme política de privacidade.
       >
       > Em caso de dúvida, fale comigo: caio.gurgel.guerra@gmail.com.
   - **Email para `ADMIN_NOTIFICATION_EMAIL`** (auditoria Art. 37):
     - **Assunto:** `Cliente solicitou exclusão LGPD — ${nome_completo}`
     - **Corpo:**
       > Cliente **${nome_completo}** (id: ${userId}, email: ${email}) usou o botão "Excluir minha conta" em ${timestamp}.
       >
       > A exclusão de auth.users + profile já foi concluída tecnicamente. Resta apenas:
       > - Registrar na planilha LGPD Art. 37 (`tipo_operacao=eliminacao_titular_self_service`).
5. Falha de Resend (qualquer um dos 2) não desfaz a deleção — log via `console.error` + retorno OK. O `audit-orphan-leads` não cobre esse failure mode (só audita leads em status='lead'); por isso, se Caio NÃO receber o email "Cliente solicitou exclusão" dentro de 1h após o cliente clicar, é sinal de problema no Resend. Documentado em §7.8 como risco aceito 1A.
6. Retornar `respond({ ok: true })`.

**Try/catch global** envolvendo passos 1–6:
```ts
try {
  /* ... passos 1-6 ... */
} catch (e) {
  console.error('delete-own-account exception:', e);
  return respond({ error: 'internal' }, 500);
}
```
Sem isso, exceção não-capturada vira 500 sem CORS → frontend só vê "erro de rede".

### 5.5 Variáveis de ambiente

**EasyPanel (frontend):**
```
VITE_SUPABASE_URL=https://<projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Supabase Functions Secrets** (configurar via `supabase secrets set` ou painel):
```
RESEND_API_KEY=re_...
ADMIN_NOTIFICATION_EMAIL=caio.gurgel.guerra@gmail.com
APP_URL=https://www.meumapafinanceiro.ia.br
WEBHOOK_SECRET=<32 bytes random — gerar com `openssl rand -base64 32 | tr '+/' '-_' | tr -d '='`>
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são auto-injetadas em Edge Functions (Deno runtime) — não precisam ser configuradas manualmente, mas o código consome via `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` (com prefixo).

**Runbook de rotação de `WEBHOOK_SECRET`** (caso vaze por commit acidental ou log indevido):
1. Gerar novo: `openssl rand -base64 32 | tr '+/' '-_' | tr -d '='`.
2. Atualizar `WEBHOOK_SECRET` em Supabase Functions Secrets (`supabase secrets set` ou painel).
3. Atualizar o header `x-webhook-secret` no Database Webhook (Database → Webhooks → editar → HTTP Headers).
4. Confirmar com smoke (criar lead de teste) que `notify-new-lead` recebe header novo. Janela de 401s entre passos 2 e 3 é < 1 minuto.

`VITE_SUPABASE_ANON_KEY` é exposta no bundle JS por design — segurança fica em RLS no Postgres + validação JWT nas Edge Functions. Nunca usar `service_role` no frontend.

### 5.6 Domínio do Resend

**Antes do go-live (D-7 ideal):**

1. **Auditar SPF existente** em `meumapafinanceiro.ia.br`:
   ```sh
   dig +short TXT meumapafinanceiro.ia.br | grep "v=spf1"
   ```
   RFC 7208 permite **apenas 1 registro SPF**. Se já houver SPF (Google Workspace, Outlook, etc.), **não criar segundo** — mergear includes:
   - Sozinho com Resend: `v=spf1 include:_spf.resend.com ~all`
   - Com Google Workspace + Resend: `v=spf1 include:_spf.google.com include:_spf.resend.com ~all`
2. Adicionar domínio no painel Resend.
3. Copiar registros DKIM (3 CNAMEs gerados pelo Resend, distintos por seletor) e DMARC fornecidos.
4. Cadastrar no DNS do registro.br (modo avançado, já habilitado conforme deploy stack).
5. **DMARC com destinatário definido para os relatórios:**
   ```
   _dmarc.meumapafinanceiro.ia.br TXT "v=DMARC1; p=none;
   rua=mailto:caio.gurgel.guerra@gmail.com;
   ruf=mailto:caio.gurgel.guerra@gmail.com; fo=1; pct=100"
   ```
   - RFC 7489 permite mailto para qualquer endereço (não exige alias no domínio); usar Gmail pessoal de Caio é a opção sem custo. Se futuramente Caio adotar Google Workspace no domínio, trocar para `dmarc-rua@meumapafinanceiro.ia.br` para separar caixa.
   - Iniciar com `p=none` (monitoramento) por 7 dias após verificação. Caio revisa relatórios diariamente — relatórios DMARC chegam como anexos XML diários (filtrar por etiqueta no Gmail).
   - Endurecer para `p=quarantine` (e depois `p=reject`) somente após 7 dias de relatórios sem falha de SPF/DKIM em emails legítimos.
6. Confirmar verificação no Resend antes de enviar primeiro email.
7. **Warmup do domínio:** enviar emails para inboxes próprios primeiro (Gmail, Outlook, provedor corporativo) e validar que chegam fora do spam antes de enviar pra cliente real.

**Limites do free tier Resend (relevante na Fase 1A):**
- 100 emails/dia, 3.000/mês.
- **Antes da verificação do domínio**, o Resend só envia para o email da própria conta — smoke test que tente enviar para um endereço de teste arbitrário falhará. Solução: durante smoke test, usar email pessoal de Caio como cliente teste, ou aguardar verificação do domínio (que pode levar 24-48h após DNS).
- Caso volume cresça, upgrade pago é simples (não bloqueia 1A).

**Falha de email NÃO bloqueia o fluxo principal.** Persistência do estado (status no banco) sempre tem precedência sobre entrega de email. Caio acompanha pelo `/admin` e via cron de auto-auditoria (§7.9). Fallback combinado: WhatsApp.

---

## 6. Estrutura de arquivos e convenções

### 6.1 Árvore de arquivos novos

```
src/
├── lib/
│   ├── calculators/                # EXISTENTE — calculadoras de aposentadoria/salário (intactas)
│   ├── supabase/
│   │   ├── client.ts              # createClient() singleton
│   │   └── types.ts               # Tipos derivados do schema (Profile, ClientStatus, etc.)
│   ├── auth/
│   │   ├── schemas.ts             # Zod schemas (cadastroSchema, loginSchema, etc.)
│   │   ├── mutations.ts           # signUp, signIn, signOut, resetPassword, updatePassword, updateOwnProfile, deleteOwnAccount
│   │   └── safe-next.ts           # Sanitiza param ?next= contra open-redirect (§3.2)
│   ├── admin/
│   │   ├── queries.ts             # listClients (com filtros, via view profiles_with_email)
│   │   └── mutations.ts           # releaseClient (chama Edge Function), rejectClient
│   ├── legal/
│   │   └── version.ts             # POLICY_LAST_UPDATED, TERMS_LAST_UPDATED (constantes — texto puxa daqui)
│   └── notifications/
│       └── (Edge Functions invocadas via supabase.functions.invoke)
├── hooks/
│   └── auth/
│       ├── useAuth.ts             # Sessão atual via supabase.auth.onAuthStateChange (sync entre abas é nativo do supabase-js v2 via storage events; NÃO usar BroadcastChannel manual)
│       └── useProfile.ts          # Profile do usuário logado (loading/error/refetch); retorna null+sinal "orphan" quando session existe mas profile não
├── components/
│   ├── AuthLayout.tsx             # Header global (logo + email + Sair) + Outlet + Footer
│   ├── PublicLayout.tsx           # Header existente + Outlet + Footer
│   ├── RequireAuth.tsx
│   ├── RequireAdmin.tsx
│   ├── RequireClient.tsx
│   ├── RequireGuest.tsx           # Bloqueia rotas auth se já houver sessão (§3.2)
│   ├── FullScreenSpinner.tsx      # Estado de loading unificado (§3.2) — evita duplo flash
│   ├── OrphanProfileError.tsx     # Tela para useProfile.status === 'orphan' (§3.2)
│   ├── ConnectionErrorScreen.tsx  # Tela para useProfile.status === 'error' com retry (§3.2)
│   ├── ConfirmDialog.tsx          # Modal de confirmação (wrapper sobre @headlessui/react Dialog) — ações sensíveis (§3.7)
│   ├── ErrorBoundary.tsx          # Captura erros não-tratados de render (§6.1.1)
│   ├── Footer.tsx                 # Compartilhado entre AuthLayout e PublicLayout
│   └── forms/
│       ├── FormField.tsx          # Wrapper com label + erro + tooltip touch-friendly
│       ├── UFSelect.tsx           # Select dos 27 estados
│       ├── DependentesInput.tsx   # Array dinâmico de idades (max 10)
│       └── PhoneInput.tsx         # Parser tolerante (4 formatos), armazena E.164
├── pages/
│   ├── auth/
│   │   ├── CadastroPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── ConfirmeEmailPage.tsx
│   │   ├── RecuperarSenhaPage.tsx
│   │   ├── RedefinirSenhaPage.tsx
│   │   ├── PrivacidadePage.tsx
│   │   └── TermosPage.tsx
│   ├── cliente/
│   │   ├── AguardandoPage.tsx
│   │   ├── LiberadoPage.tsx
│   │   ├── MeusDadosPage.tsx
│   │   └── ContaExcluidaPage.tsx
│   └── admin/
│       ├── ListaClientesPage.tsx
│       └── DetalheClientePage.tsx
└── App.tsx                        # MODIFICADO: adicionar rotas novas com layouts (ver §6.1.1)

supabase/                          # NOVO
├── migrations/
│   └── 20260507000001_init_profiles.sql
└── functions/
    ├── notify-new-lead/
    │   └── index.ts
    ├── release-client/
    │   └── index.ts
    ├── delete-own-account/
    │   └── index.ts                # Exclusão LGPD atômica (§3.7, §5.4.1)
    └── audit-orphan-leads/
        └── index.ts                # Cron pg_cron 1h — detecta webhook silencioso (§7.9)

docs/legal/                        # NOVO — documentos jurídicos
└── lia-ip-logs.md                 # Legitimate Interest Assessment para IP/logs (§4.4)
```

**Coexistência com calculadoras existentes:** `src/lib/calculators/` (memória do projeto) permanece intacta. Os novos diretórios `auth/`, `admin/`, `legal/`, `notifications/`, `supabase/` são domínios paralelos, não substituem nem refatoram código existente. Calculadoras públicas em `/`, `/aposentadoria`, `/salario` continuam funcionando como antes.

### 6.1.1 Layout switch no `App.tsx`

Estrutura de rotas com layouts explícitos + providers globais (resolve a ambiguidade de qual layout envolve quais rotas):

```tsx
// src/App.tsx (estrutura conceitual)
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          {/* Rotas públicas — usam header existente */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/aposentadoria" element={<AposentadoriaPage />} />
            <Route path="/salario" element={<SalarioPage />} />
            <Route path="/privacidade" element={<PrivacidadePage />} />
            <Route path="/termos" element={<TermosPage />} />
            <Route path="/conta-excluida" element={<ContaExcluidaPage />} />

            {/* Auth pages — RequireGuest somente em /cadastro e /login.
                /recuperar-senha e /redefinir-senha permitem sessão (admin pedindo
                troca da própria senha; recovery transitório). Ver §3.2. */}
            <Route path="/cadastro" element={<RequireGuest><CadastroPage /></RequireGuest>} />
            <Route path="/login" element={<RequireGuest><LoginPage /></RequireGuest>} />
            <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
            <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
            <Route path="/confirme-email" element={<ConfirmeEmailPage />} />
          </Route>

          {/* Rotas autenticadas cliente — AuthLayout com header de logout */}
          <Route element={<RequireAuth><RequireClient><AuthLayout /></RequireClient></RequireAuth>}>
            <Route path="/aguardando" element={<AguardandoPage />} />
            <Route path="/liberado" element={<LiberadoPage />} />
            <Route path="/meus-dados" element={<MeusDadosPage />} />
          </Route>

          {/* Rotas autenticadas admin */}
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

- `<Toaster>` (sonner) é montado uma vez no nível raiz — sem ele, nenhum `toast.success/error/info` aparece.
- `<ErrorBoundary>` captura erros não-tratados de render e mostra fallback amigável (não branco).
- `<RequireAuth>`/`<RequireClient>`/`<RequireAdmin>`/`<RequireGuest>` lidam com `useProfile.status === 'orphan' | 'error' | 'loading'` antes de decidir o destino — guards mostram o componente correto para cada estado em vez de assumir profile válido.
- `Footer` é renderizado dentro de cada layout (não duplicado — apenas reutilizado).

### 6.2 Convenções

**Formulários:** sempre via `react-hook-form` + `zod` (`zodResolver`). Schemas em `src/lib/auth/schemas.ts`. Nada de validação manual em `onChange`.

**Mutations Supabase:** centralizadas em `src/lib/auth/mutations.ts` e `src/lib/admin/mutations.ts`. Componentes só chamam funções (`signUp(data)`), nunca `supabase.auth.signUp(...)` direto.

**Tipos:** gerados via `supabase gen types typescript` quando possível, manualmente espelhados em `src/lib/supabase/types.ts` na Fase 1A.

**Toast:** `sonner` — `import { toast } from 'sonner'` + `<Toaster />` no AuthLayout/PublicLayout. Sucesso: `toast.success(...)`. Erro: `toast.error(...)`.

**Modal:** Fase 1A usa `window.confirm()` nativo para "Liberar" e "Recusar" (workflow leve). Trocar por modal Tailwind se virar atrito real.

**i18n:** PT-BR hardcoded no JSX. Sem i18n na Fase 1A.

**WhatsApp helper centralizado:** placeholders `[link]` viram chamadas de função `whatsappUrl(context)` em `src/lib/contact/whatsapp.ts`. Função monta `https://wa.me/55${WHATSAPP_DDD}${WHATSAPP_NUM}?text=${encodeURIComponent(template)}` com mensagem pré-preenchida por contexto:
- `'aguardando'` → "Olá Caio, sou {nome} e quero saber sobre o status do meu cadastro."
- `'liberado'` → "Olá Caio, fui liberado e quero combinar próximos passos."
- `'email_errado'` → "Olá Caio, errei o email no cadastro e preciso refazer."
- `'orfao'` → "Olá Caio, deu erro no meu cadastro (sou {email})."
- `'duvida_geral'` → vazio (cliente digita).

**Estilo:** seguir padrão visual existente:
- Header gradient azul: `bg-gradient-to-r from-blue-900 to-indigo-700 px-6 py-5`
- Cards: `bg-white rounded-xl shadow-sm border border-gray-100 p-6`
- Inputs: `border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500`
- Tooltips pedagógicos curtos abaixo de cada input

**Erros:** mensagens em PT-BR centralizadas (§7.1).

### 6.3 Estados de carregamento

Padrão Tailwind, sem libs externas:

- **Skeleton de listas** (admin):
  ```tsx
  <div className="animate-pulse space-y-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="h-12 bg-gray-200 rounded" />
    ))}
  </div>
  ```
- **Spinner inline** (botões em loading):
  ```tsx
  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">...</svg>
  ```
- **Tela cheia** (RequireAuth resolvendo sessão):
  ```tsx
  <div className="min-h-screen flex items-center justify-center">
    <Spinner />
  </div>
  ```

### 6.4 Acessibilidade mínima

- Labels associados via `htmlFor` em todos os inputs
- Erros vinculados via `aria-describedby`
- Foco visível em todos os elementos interativos (Tailwind ring default já cobre)
- Botão de logout com `aria-label="Sair da conta"`
- Modais (quando virarem custom): `role="dialog" aria-modal="true"` + foco no primeiro botão
- Tabela `/admin` com `<caption className="sr-only">Lista de clientes</caption>`

### 6.5 SEO

- Páginas autenticadas (auth/cliente/admin): `<title>` específico + `<meta name="robots" content="noindex" />`
- `/privacidade`: indexável
- Implementação via `useEffect(() => { document.title = '...' }, [])` (sem react-helmet na Fase 1A)

---

## 7. Tratamento de erros, testes e release

### 7.1 Tratamento de erros — auth

| Cenário | UX | Mensagem |
|---|---|---|
| Email já cadastrado no signup | Toast erro + link "fazer login" / "esqueci senha" | "Este email já está cadastrado. Faça login ou recupere sua senha." |
| Detecção: `data.user?.identities?.length === 0` | — | (depende de "Confirm email" ON no Supabase) |
| Email não confirmado tenta logar | Toast com botão "reenviar email" | "Confirme seu email antes de fazer login. [Reenviar link]" |
| Senha errada | Erro genérico (não revelar se email existe) | "Email ou senha incorretos." |
| Senha curta no signup | Erro inline no campo (Zod) | "A senha deve ter ao menos 8 caracteres." |
| Senhas não conferem | Erro inline (Zod) | "As senhas não conferem." |
| Checkbox de privacidade não marcado | Erro inline (Zod) | "É necessário aceitar a Política de Privacidade para criar a conta." |
| Token de reset expirado / link inválido | Tela de erro com link pra `/recuperar-senha` | "Link expirado ou inválido. Solicite um novo." |
| Reset em conta não confirmada | Permitir; gotrue v2 marca `email_confirmed_at` automaticamente após `updateUser` em fluxo recovery; redirecionar pra `/login` | (sem mensagem de erro) |
| Reenvio de confirmação em rate limit | Toast com mensagem específica + cooldown 60s no botão (§3.4) | "Muitos pedidos. Aguarde alguns minutos e tente de novo." |
| Honeypot acionado | Rejeição silenciosa, redireciona pra `/` | (sem mensagem) |
| `next=<url>` malformado/externo no /login | `safeNext` retorna `/`, sem erro visível | (silencioso) |
| Profile órfão (session sem profile) | Tela `OrphanProfileError` com CTA WhatsApp + Sair | "Encontramos um problema com seu cadastro. Por favor, fale com Caio no WhatsApp para resolvermos." |

### 7.2 Tratamento de erros — rede / Supabase

- Toast genérico: "Erro ao salvar. Tente novamente em instantes."
- RHF preserva estado do formulário (não limpa em erro)
- Sem retry automático na Fase 1A

### 7.3 Validação dupla

- **Client (Zod):** UX rápida —
  - Telefone: regex E.164 BR `/^\+55[1-9][1-9]\d{8,9}$/` (espelho do CHECK SQL) após normalização do parser do PhoneInput
  - Idade dos dependentes: 0-120, max 10 dependentes
  - `data_nascimento`: entre `1900-01-02` e `today - 18 anos` (espelho do trigger `profiles_validate_domain`)
  - UF: enum dos 27 estados
  - Checkbox de privacidade: `z.literal(true)`
- **Server (RLS + triggers):** linha de defesa final —
  - `profiles_validate_domain_trg`: data_nascimento futura/menor que 1900/aplica floor 18 anos; idades fora de [0,120]
  - CHECK constraint: telefone fora de E.164 (`^\+55[1-9][1-9]\d{8,9}$`) e UF fora de `^[A-Z]{2}$`
  - RLS + triggers `protect_columns`/`prevent_self_demote`/`prevent_last_admin_delete`: integridade de status/is_admin

Confiar no banco, não na UI. Nunca remover policies "porque o frontend já valida".

### 7.4 Testes

Pela preferência registrada (`feedback_workflow_leve` — testes só em lógica de cálculo):

- **Sem testes unitários novos** na Fase 1A. É CRUD + auth, não tem lógica de cálculo.
- **Smoke test manual obrigatório** antes do release (§7.6).
- **Teste de RLS obrigatório** antes do go-live — não opcional, RLS mal configurado vaza dados entre clientes.

Smoke + RLS test são checagens de release, não testes automatizados — coerentes com workflow leve.

### 7.5 Roteiro de teste RLS

**Modo recomendado:** via API com tokens reais usando `curl`. SQL Editor do Studio roda como `service_role` e bypassa RLS, então SQL direto não é o teste correto.

**Setup:**
1. Criar 2 usuários de teste no Studio: `userA@test.com`, `userB@test.com` (ambos com auto-confirm ON)
2. Marcar admin via SQL: `update profiles set is_admin = true where id = (select id from auth.users where email = 'admin@test.com');` (ou usar o admin de produção do §2.3)
3. Pegar JWT de cada um via login pela API:
   ```bash
   curl -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
     -H "apikey: $ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"email":"userA@test.com","password":"..."}' \
     | jq -r .access_token
   ```

**Casos a validar:**

| # | Como | Operação | Esperado |
|---|---|---|---|
| 1 | userA | SELECT * FROM profiles | só vê própria linha |
| 2 | userA | UPDATE próprio nome_completo | sucesso |
| 3 | userA | UPDATE status próprio para 'liberado' | trigger silenciosamente reverte (nome_completo persiste, status volta a 'lead') |
| 4 | userA | UPDATE is_admin próprio para true | trigger reverte |
| 5 | userA | UPDATE outro perfil | RLS bloqueia |
| 6 | admin | SELECT * FROM profiles | vê todos |
| 7 | admin | UPDATE userA status para 'liberado' | sucesso |
| 8 | admin | UPDATE próprio is_admin para false | erro do trigger anti-self-demote |
| 9 | userA | DELETE próprio perfil | sucesso |
| 10 | sem auth | SELECT * FROM profiles | RLS bloqueia (sem rows) |
| 10b | userA após DELETE próprio | login com mesmo JWT (ainda válido) → fetch profile | retorna null/empty; frontend mostra `OrphanProfileError` (§3.2) |
| 11 | admin único | DELETE auth.users via Studio (cascade dispara) | trigger `profiles_prevent_last_admin_delete` aborta com mensagem específica |
| 12 | userA | UPDATE outro perfil via PostgREST | RLS bloqueia (0 rows affected) |
| 13 | profile órfão de userA (após RAISE WARNING no `handle_new_user`) | INSERT direto via PostgREST com `data_nascimento < 18 anos`, `is_admin=false`, `status='lead'` | trigger `profiles_validate_domain` rejeita com mensagem específica (testa que floor 18 anos não fura) |
| 14a | userA | DELETE em outro perfil (`delete from profiles where id = <admin_id>`) | RLS retorna 0 rows affected — não chega ao trigger (testa policy `profiles_delete_self`) |
| 14b | admin (único) | DELETE em si mesmo (`delete from profiles where id = <admin_id>` com JWT do admin) | trigger `profiles_prevent_last_admin_delete` aborta — testa o trigger isoladamente da RLS |
| 15 | admin com 100 perfis seed | `EXPLAIN ANALYZE select * from profiles_with_email where is_admin = false order by created_at desc` | confirmar (a) índice parcial `profiles_admin_list_idx` é usado, (b) `is_admin()` é avaliada 1x (STABLE), (c) tempo total < 50ms |
| 16 | userA | `select email from profiles_with_email where id = <userB_id>` | 0 rows (filtro `where` da view bloqueia) |
| 17 | sem JWT (anon) | `select * from profiles_with_email` | 0 rows (filtro requer auth.uid()) ou 401 dependendo do PostgREST |

Cada caso vira um `curl` ou request via PostgREST. Documentar resultados antes do go-live.

### 7.6 Plano de release

**Pré-requisito 0 (D-7) — bloqueadores externos:**
1. **Auditar SPF existente** em `meumapafinanceiro.ia.br` (`dig +short TXT meumapafinanceiro.ia.br | grep "v=spf1"`). Se houver, planejar merge com `_spf.resend.com` em **um único** registro (RFC 7208). Ver §5.6.
2. **DMARC apontando para `caio.gurgel.guerra@gmail.com`** (mailto direto, sem necessidade de alias no domínio — RFC 7489 §6.2). Se futuramente houver Workspace no domínio, migrar para alias dedicado.
3. Iniciar verificação de domínio no Resend (DNS em registro.br pode levar 24-48h).
4. Iniciar warmup do domínio com emails internos.

**Pré-requisitos manuais (uma vez só):**

5. Criar projeto Supabase em supabase.com → copiar URL e anon key. **Criar também projeto `staging` espelho** (mesmo time, free tier permite até 2 projetos por org) para rodar smoke tests destrutivos (`RESEND_API_KEY` inválida, etc) sem afetar produção.
6. **Configurar Auth → Settings:** "Confirm email" = ON, "Enable signups" = ON, **JWT expiry = 3600 (1h)** + Refresh Token Lifetime = 86400 (24h) em vez do default (1h JWT + 1 ano refresh). Reduzir só o JWT não força reauth — o refresh renova silenciosamente. Para garantir que sessão expire em 24h, ambos precisam ser reduzidos. Trade-off em §8.
7. Customizar templates de email Supabase em PT-BR (textos da §5.2).
8. Configurar redirect URLs no Supabase Auth → URL Configuration:
   - `https://www.meumapafinanceiro.ia.br/redefinir-senha`
   - `https://www.meumapafinanceiro.ia.br/login`
   - **(opcional)** apex sem www se DNS resolver: `https://meumapafinanceiro.ia.br/redefinir-senha` e `/login` — recomendado redirecionar apex→www no nginx do EasyPanel para evitar essa duplicação.
   - `http://localhost:5173/redefinir-senha` (dev)
   - `http://localhost:5173/login` (dev)
9. Adicionar env vars no EasyPanel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
10. Adicionar secrets nas Edge Functions: `RESEND_API_KEY`, `ADMIN_NOTIFICATION_EMAIL`, `APP_URL`, `WEBHOOK_SECRET`.
11. Configurar Database Webhook: Database → Webhooks → "AFTER INSERT on profiles" → URL da Edge Function `notify-new-lead` + header `x-webhook-secret: $WEBHOOK_SECRET` (nome do header customizado, alinhado com a Edge Function).
12. Aceitar e arquivar DPAs do Supabase e Resend (LGPD — operadores).
13. Confirmar regime societário (PF/MEI/LTDA) e ajustar texto de §3.10 item 1 e footer §3.11 com número Planejar e CNPJ se aplicável.

**Sequência de deploy:**

1. Aplicar migration `20260507000001_init_profiles.sql` (CLI ou Studio).
2. Deploy Edge Functions: `supabase functions deploy notify-new-lead && supabase functions deploy release-client`.
3. Criar admin via §2.3 (Studio + SQL com data_nasc real e demais campos preenchidos).
4. Push do código no master → EasyPanel auto-deploy.
5. Smoke test (§7.7).
6. Teste RLS via curl (§7.5).

### 7.7 Smoke test pós-deploy (~25 min)

**Caminho feliz:**
- [ ] Acessar `/cadastro` em incógnito, criar conta de teste
- [ ] Confirmar trigger criou row em profiles via SQL Editor
- [ ] Email de confirmação chega no inbox; link funciona; redireciona para `/login`
- [ ] Login redireciona pra `/aguardando` (status=lead)
- [ ] Email "novo lead" chega no inbox do Caio (via webhook) com email do cliente correto
- [ ] Caio (admin) loga, acessa `/admin`, vê o lead listado, NÃO vê a si mesmo
- [ ] Clica "Liberar" → status muda no banco; toast "Cliente liberado. Email enviado."
- [ ] Email "acesso liberado" chega no inbox do cliente teste com nome correto
- [ ] Clicar "Liberar" 2x não envia 2 emails (idempotência) — toast 2º clique: "Cliente já estava liberado…"
- [ ] Cliente teste edita nome em `/meus-dados` → persiste; status NÃO mudou
- [ ] Cliente teste tenta acessar `/admin` → redirect pra `/liberado`
- [ ] Botão "Recusar" em outro lead → status=rejeitado, motivo gravado, sem email
- [ ] Logout em qualquer página autenticada → redirect `/` + toast "Você foi desconectado…"
- [ ] Rotas antigas intactas: `/`, `/aposentadoria`, `/salario`

**Auth edge cases:**
- [ ] Cadastrar com email JÁ existente → toast "Este email já está cadastrado…" (regressão crítica do hack `identities.length === 0`)
- [ ] Honeypot field preenchido programaticamente no submit → cadastro silenciosamente rejeitado, redireciona para `/`
- [ ] `/recuperar-senha` envia email; link funciona; nova senha permite login; sessão em outro browser é invalidada (logout global pós-reset)
- [ ] `/recuperar-senha` em conta sem email confirmado → reset funciona, login pós-reset OK (gotrue marca `email_confirmed_at`)
- [ ] Reenviar email de confirmação em `/confirme-email` funciona; cooldown 60s no botão visível
- [ ] Tentar acessar `/redefinir-senha` direto sem token → erro "Link inválido ou expirado" após 8s
- [ ] Link de reset > 1h depois de gerado → erro "Link expirado"
- [ ] Login com `?next=https://evil.com` → redirect para `/` (sanitizado), não para evil.com
- [ ] Login com `?next=//evil.com` → redirect para `/`
- [ ] Login com `?next=/admin` para usuário não-admin → redirect via tabela inteligente (não para /admin)
- [ ] Duas abas autenticadas, logout em uma → **alternar foco para a segunda aba** (storage events em aba background podem atrasar) → detecta logout e redireciona
- [ ] Acessar `/cadastro` ou `/login` com sessão ativa → `RequireGuest` redireciona via tabela inteligente
- [ ] Modal "Excluir minha conta": digitar texto diferente de `EXCLUIR` → botão fica disabled. Cancelar → no-op. `EXCLUIR` exato → chama Edge Function, conta some, redireciona para `/conta-excluida`, Caio recebe email "Cliente solicitou exclusão LGPD"

**Robustez de trigger e profile órfão:**
- [ ] Forçar `handle_new_user` no caminho whitelist (metadata corrompida — `dependentes` como string em vez de array) via `curl` na API Auth (não Studio — UI não expõe metadata customizada):
  ```bash
  curl -X POST "$SUPABASE_URL/auth/v1/admin/users" \
    -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d '{"email":"orfao@test.com","password":"...","user_metadata":{"dependentes":"isso-nao-eh-array"}}'
  ```
  → auth.users criado, trigger loga `RAISE WARNING`, profile não é criado, frontend mostra `OrphanProfileError`.
- [ ] Forçar `handle_new_user` no caminho NÃO-whitelist (cadastrar com `data_nascimento` futura — viola check do `validate_domain`): signUp deve **abortar com erro**, auth.users **não** é criado. Garante que bugs reais não viram silenciosos.

**Resend / falhas de email:**
- [ ] **Em ambiente staging/dev** (NÃO produção): setar `RESEND_API_KEY` inválida → clicar "Liberar" → UPDATE acontece, toast "Cliente liberado, mas o email falhou. Avise por WhatsApp." Status no banco é `liberado`. Restaurar a key. *Nunca rodar este caso em produção: afeta usuários reais que se cadastrem na janela.*
- [ ] Cron `audit-orphan-leads` detecta lead com > 1h sem email enviado (forçar webhook a falhar uma vez) e envia email digest pra Caio (§7.9).

**Mobile:**
- [ ] `/cadastro` em viewport 375px: layout legível, tooltips abrem ao tap, draft salva ao trocar de aba
- [ ] `/admin` em viewport 375px: cards empilhados em vez de tabela
- [ ] `/aguardando`, `/liberado`, `/meus-dados` em mobile: footer sem overflow

**Acessibilidade:**
- [ ] Tab key navega na ordem lógica em `/cadastro` (honeypot pulado por `tabIndex={-1}`)
- [ ] Após submit do cadastro, foco vai para `<h1>` da `/confirme-email`

### 7.8 Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Verificação DNS Resend pode levar 24-48h | Iniciar D-7. Sem domínio verificado, emails 3-4 não saem. |
| Conflito de SPF (já existe outro registro no domínio) | Auditar com `dig` antes de adicionar Resend; mergear includes em SPF único (§5.6) |
| DMARC `p=reject` antes do warmup descarta emails legítimos | Iniciar com `p=none`, só endurecer após 7 dias com relatórios limpos. Aliases `dmarc-rua@` e `dmarc-ruf@` configurados como pré-req |
| pg_net não retenta — webhook silencioso | Cron de auto-auditoria (§7.9) detecta lead `lead` há > 1h sem email enviado e gera log para Caio |
| Cadastro aberto vira alvo de bots | Honeypot field (§3.3) + rate limit padrão Supabase (60 signups/h por IP). Adicionar Cloudflare Turnstile na 1B se persistir |
| RLS mal escrita vaza dados | Roteiro de teste RLS via curl obrigatório (§7.5) |
| Caio se cadastra como cliente normal e bagunça lista admin | §2.3 instrui criar admin via Studio + SQL direto, sem usar /cadastro |
| Cliente digita email errado e fica preso | Botão WhatsApp em /confirme-email + runbook §4.4 (admin deleta auth.user, avisa cliente para refazer) |
| Cliente em /aguardando indefinidamente | Bloco de warning após 3 dias úteis (§3.5) + admin filtra por mais antigos + recusa por inatividade > 14 dias |
| Cliente rejeitado vê tela genérica de "fila" | Aceito — Caio comunica recusa por canal externo (WhatsApp/email) |
| Sessão JWT de 1 ano (default Supabase) em app financeiro | **Configurar JWT expiry = 24h** no painel Auth (custo zero, ver pré-req §7.6.6) |
| Open redirect via `?next=` | `safeNext()` valida path relativo, smoke test cobre |
| `identities.length === 0` (detecção email duplicado) quebrar em upgrade do supabase-js | Travar versão exata; smoke test §7.7 inclui caso de regressão |
| **Incidente de segurança / data breach (LGPD Art. 48)** | Runbook §4.4 com timeline ANPD em 2 dias úteis + aliases de comunicação preparados |
| **Cadastro de menor de 18 anos** | Trigger SQL + Zod bloqueiam; runbook §4.4 cobre exclusão se passar pela validação |
| **Falta de DPO formal** | Política §3.10 item 1 indica Caio como controlador-encarregado (DPO); revisar quando volume justificar terceirizado |
| **Transferência internacional sem fundamento explícito** | Política §3.10 item 4 declara base legal; DPAs Supabase/Resend assinados como pré-req |
| **Sucessão / incapacidade do controlador** | Runbook §4.4 com cofre digital e processo de encerramento ordenado |
| Política de privacidade — base legal e regulamentação CFP/CVM | BLOQUEADOR antes do go-live: Caio confirma com advogado próprio (políticas §3.10 itens 7 e 11; CNPJ no §3.11; número Planejar) |
| Falha silenciosa de Resend em `delete-own-account` (Caio não recebe notificação de exclusão) | Log via `console.error` + monitoramento manual (Caio confere se recebeu email "Cliente solicitou exclusão" em até 1h). Aceito como risco 1A; Fase 1B+ pode introduzir tabela `lgpd_audit_log` com INSERT antes da deleção (sobrevive a falha de email) |
| Janela de poder do admin em sessão (24h via Refresh Token) | Mitigações 1A: Caio acessa só em devices próprios; lógica de re-auth em ações sensíveis (clicar "Liberar") fica em Fase 1B. Refresh Token de 24h em vez de 1 ano default já reduz superfície |
| Smoke test com `SERVICE_ROLE_KEY` em shell history | Antes de rodar `curl` em terminal, executar `unset HISTFILE` ou usar arquivo `.env` lido via `--data @file.json` + `Authorization: Bearer $(cat key)`. Documentado em §7.7. |

### 7.9 Observabilidade

- **Supabase Logs:** auth + Edge Functions + Webhooks — suficiente para Fase 1A.
- **Erros de email:** logam no Edge Function logs mas não bloqueiam fluxo.
- **Admin acompanha leads "sumidos"** pelo `/admin` ordenado por `created_at`.
- **Cron de auto-auditoria — OBRIGATÓRIO na 1A** (Supabase Cron via `pg_cron`):
  - **Por que obrigatório:** `pg_net` (usado pelo Database Webhook) é fire-and-forget — sem retry no Postgres. Se a Edge Function `notify-new-lead` der 5xx ou Resend cair, o lead é criado mas Caio não é notificado. **A única detecção desse failure mode é este cron.** Sem ele, lead "some" até Caio entrar no `/admin` manualmente.
  - **Periodicidade:** a cada 1h.
  - **Query:** `select id, nome_completo, created_at from public.profiles where is_admin = false and status = 'lead' and created_at < now() - interval '1 hour' and created_at > now() - interval '24 hours';` (janela 1h–24h: ignora leads recém-criados e os já visualmente óbvios na lista do `/admin`).
  - **Implementação:** Edge Function `audit-orphan-leads` agendada via `pg_cron` no painel Supabase. Envia email digest 1x/h pra `ADMIN_NOTIFICATION_EMAIL` se houver órfãos. Trivial (~30 linhas).
  - Arquivo: `supabase/functions/audit-orphan-leads/index.ts`.
- **Sem APM externo, sem analytics na Fase 1A** — Plausible/Umami pode entrar na 1B se o funil precisar ser medido.

---

## 8. Trade-offs aceitos / dívidas conhecidas

Decisões conscientes que podem ser revistas em fases futuras:

- **`on delete cascade` sem soft-delete** — exclusão de auth.user remove profile permanentemente. **Atenção:** colide aparentemente com a retenção de 5 anos declarada em §3.10 item 7. A política prevalece o pedido de exclusão do titular (Art. 18); a retenção só vale na ausência desse pedido. Texto da política agora torna isso explícito. Fase 1B+ pode adotar `deleted_at` + audit log para ter granularidade entre exclusão LGPD e exclusão administrativa.
- **Sem rate limit explícito por IP/usuário** — idempotência via guards de status + rate limit padrão Supabase Auth (60 signups/h por IP). Adicionar Cloudflare Turnstile se virar problema.
- **Sem analytics nem funnel tracking** — Caio não saberá conversão home → cadastro → confirmação → liberação. Aceitável Fase 1A. Adicionar Plausible/Umami posteriormente se valor justificar.
- **Templates de email sem branding visual rico** — texto + HTML simples (Resend aceita ambos), sem template engine elaborado. OK para Fase 1A.
- **`/admin` sem campo de anotação livre do consultor** — Caio anota WhatsApp/contexto em ferramenta externa (Notion/Drive). Fase 1B introduz tabela `consultor_notes`.
- **`/meus-dados` sem detecção de conflito (last-write-wins)** — risco baixo na 1A (Caio atua sequencialmente). Fase 1B+ usa `If-Match`/`updated_at`.
- **`dependentes int[]`** — sem ordenação garantida, sem dedup, sem parentesco. Fase 1B migra para tabela dedicada `profile_dependentes`.
- **`/liberado` exibe `updated_at` como "data de liberação"** — aproximação imperfeita; coluna dedicada `liberado_at` entra se a UX da Fase 1B exigir.
- **Modal `window.confirm()`/`prompt()`** apenas em Liberar/Recusar do `/admin` (uso interno por Caio) — exclusão de conta do cliente já usa modal Tailwind custom (§3.7). Trocar Liberar/Recusar por `ConfirmDialog` se Caio reclamar.
- **Re-derivação de `is_admin` sem cache** em `release-client`/`delete-own-account` — round-trip por chamada. OK na 1A (1 admin); Fase 1B+ pode usar cache de 60s na própria Edge Function se houver múltiplos admins.
- **JWT 1h + Refresh Token 24h (configurado)** — força reauth a cada 24h em todos os usuários. **Janela material de exposição:** se laptop de Caio (admin) for comprometido em estado autenticado, atacante tem até 24h de poder de UPDATE em todos os profiles (incluindo "liberar" cliente fictício). Para conta admin seria desejável janela menor (4–8h) ou reauth-on-sensitive-action, mas Supabase Auth não permite TTL diferenciado por role. **Aceito como dívida 1A;** Fase 1B+ adiciona re-pedir senha antes de "Liberar"/"Recusar"/"deleteUser via admin API".
- **Sem `lgpd_audit_log` dedicado** — a deleção via `delete-own-account` é registrada por email pra Caio (auditoria por Resend, não por banco). Se Resend cair, perde-se rastro. Fase 1B+: criar tabela `lgpd_audit_log (id, user_id, action, ts, payload jsonb)` com INSERT antes da deleção via service_role — sobrevive a falha de email. OK na 1A dado volume baixo.
- **`audit-orphan-leads` janela 1h–24h** — cobre detecção tardia de webhook silencioso por até 24h. Lead que ficar 25h+ sem notificação some do digest. Fase 1B+: coluna `notification_sent boolean default false` em profiles, atualizada por `notify-new-lead` no sucesso — auditoria vira "sem `notification_sent` há > 1h" sem janela superior.
- **SEO via `useEffect` setando `document.title`** — sem `<meta description>` nem Open Graph dinâmico. Bot do WhatsApp/iMessage faz preview com `<head>` estático (mesmo preview pra todas as rotas). OK na 1A; Fase 1B pode adotar `react-helmet-async`.
- **Sem indicador de força de senha (zxcvbn)** — só validamos `min 8`. Não bloqueador; comum em formulários modernos. Adicionar se houver feedback de senhas fracas.

---

## Anexos

### A.1 Checklist de prontidão para implementação

**Design técnico — pronto:**
- [x] Decisões de produto fechadas
- [x] Modelo de dados com correções de RLS/triggers (idempotência, hardening do trigger com whitelist de exceções, view profiles_with_email com security_definer + barrier, anti-órfão de admin único, floor de 18 anos)
- [x] Rotas e guards definidos com tabela completa (incluindo /termos, /conta-excluida, RequireGuest)
- [x] Fluxo de auth com trigger Postgres + raw_user_meta_data + recovery de profile órfão + estados discretos do useProfile
- [x] Edge Functions com validação JWT + idempotência + CORS em TODAS as respostas + timing-safe via `node:crypto` + lookup correto de email + `delete-own-account` atômica + `audit-orphan-leads` obrigatória
- [x] Templates de email padronizados com disclaimer CVM
- [x] Estrutura de arquivos com layouts globais, App.tsx com providers e RequireGuest
- [x] Smoke test (caminho feliz + edge cases auth + trigger whitelist/não-whitelist + Resend em staging + mobile + a11y + EXCLUIR conta) e plano de release prontos
- [x] Runbook operacional (LGPD self-service e externo, email errado, lead parado, menor, incidente ANPD, sucessão, ausência temporária do encarregado, rotação de WEBHOOK_SECRET)
- [x] Política de privacidade LGPD-compliant Versão 1 (DPO, transferência intl com Art. 33 V+IX e checkbox separado, retenção por prazos legais aplicáveis, direitos com prazo, draft de cadastro exclui ambos os checkboxes de consentimento)
- [x] Tratamento explícito de open redirect e regressão do `identities.length`
- [x] LIA documentado em `docs/legal/lia-ip-logs.md`

**Bloqueadores externos antes do go-live** (resolvidos por Caio fora do código):
- [ ] **DNS Resend configurado** (D-7)
- [ ] **Auditar SPF existente em `meumapafinanceiro.ia.br`** e mergear includes em registro único (RFC 7208)
- [ ] **DMARC apontando para `caio.gurgel.guerra@gmail.com`** (mailto direto, sem alias)
- [ ] **Projeto Supabase criado** + JWT expiry = 1h + Refresh Token Lifetime = 24h
- [ ] **DPAs Supabase + Resend** aceitos e arquivados (LGPD — operadores)
- [ ] **Termos de Uso publicados em `/termos`** com disclaimer CVM 178/2023
- [ ] **CNPJ/regime societário definido** (PF, ME ou LTDA — MEI **não** serve para CNAE 6920-6/01) → atualizar §3.10 itens 1 e 7
- [ ] **Encarregado (DPO) declarado em `/privacidade`** (Caio é controlador-encarregado na 1A)
- [ ] **Número de registro Planejar para uso da marca CFP®** no footer ("Reg. Planejar nº XXXXX")
- [ ] **Política §3.10 confirmada com advogado próprio** antes do go-live (base legal por categoria, transferência internacional Art. 33, retenção aplicável ao regime societário, item 11 sobre não recomendação CVM 178/2023). Estratégia documentada em §3.10 (logo após o texto da política) sobre publicar `/privacidade` com versão revisada ou bloquear cadastro até liberação
- [ ] **`docs/legal/lia-ip-logs.md` escrito** (3 perguntas: necessidade, balanceamento, expectativa do titular)
- [ ] **Setup `/privacidade` lê `POLICY_LAST_UPDATED`** de `src/lib/legal/version.ts` em vez de string hardcoded

**Operacionais ao go-live:**
- [ ] Planilha `lgpd-registro-operacoes` criada e templated (LGPD Art. 37)
- [ ] Cofre digital de credenciais com sucessor designado (runbook §4.4)
- [ ] Email transacional testado em Gmail, Outlook, iCloud antes do primeiro envio real
- [ ] Smoke test do caso "RESEND_API_KEY inválida" rodado em **staging** (nunca em produção)

### A.2 Referências

- Memória do projeto: `project_onboarding_cfp_fase1a.md`
- Sessão original (interrompida): `155525ad-8eb2-41e7-95ec-36fdce72d66e.jsonl`
- Stack de deploy: memória `reference_deploy_stack`
- Padrão visual: memória `project_estrutura_calculadora`
- Workflow leve: memória `feedback_workflow_leve`
- Tooltips pedagógicos: memória `feedback_tooltips_pedagogicos`
- Code review aplicado: 5 revisores paralelos em **três rodadas** (SQL/RLS, auth/Supabase, Edge Functions/Resend, UX/Frontend, Compliance/LGPD/CFP) — 15 reviews independentes:
  - Rodada 1: 14 críticos + 18 altos + ~25 médios.
  - Rodada 2 (regressões + bugs de runtime latentes): 8 críticos + 16 altos + ~12 médios — incluindo bugs (`crypto.subtle.timingSafeEqual` inexistente, CORS faltando em respostas não-preflight) e regressões (view sem permissão em `auth.users`, catch-all do trigger mascarando bugs).
  - Rodada 3 (convergência): 2 críticos compliance + 10 altos + ~10 médios — refinamentos de redação, consistência (security_invoker em §4.1, ErrorBoundary), compliance final (checkbox separado para Art. 33 IX, badge draft removido) e robustez (try/catch global, TTL do draft).
- Documentos correlatos: `docs/legal/lia-ip-logs.md` (LIA — bloqueador externo).

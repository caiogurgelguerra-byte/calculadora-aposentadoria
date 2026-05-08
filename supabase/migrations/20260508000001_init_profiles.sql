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

-- INSERT: defesa em profundidade (caminho normal é via trigger handle_new_user)
create policy profiles_insert on public.profiles
  for insert
  with check (
    auth.uid() = id
    and is_admin = false
    and status = 'lead'
    and motivo_rejeicao is null
  );

-- UPDATE próprio
create policy profiles_update_self on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- UPDATE admin
create policy profiles_update_admin on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- DELETE próprio (LGPD Art. 18)
create policy profiles_delete_self on public.profiles
  for delete
  using (auth.uid() = id);

-- DELETE admin
create policy profiles_delete_admin on public.profiles
  for delete
  using (public.is_admin());

-- ============================================================
-- Trigger: impede deletar o ÚLTIMO admin
-- ============================================================

create or replace function public.profiles_prevent_last_admin_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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
--
-- IMPORTANTE — modelo de segurança da view:
--   * security_invoker = false (default): executa com permissões do OWNER (postgres).
--     Owner tem SELECT em auth.users e public.profiles, authenticated NÃO precisa
--     de GRANT em auth.users.
--   * O filtro WHERE É a única camada de segurança — espelha a RLS de profiles.
--     SE FOR REMOVIDO, vaza email de todos os usuários para qualquer authenticated.
--   * security_barrier = true impede vazamento via predicates leaky do PostgREST.
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

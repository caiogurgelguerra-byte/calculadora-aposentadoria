-- Corrige profiles_protect_columns para permitir updates via service_role
-- (auth.uid() é NULL quando chamado por Edge Functions com service_role key)
create or replace function public.profiles_protect_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- service_role / acesso direto ao DB: auth.uid() é NULL, permitir tudo
  if auth.uid() is null then
    return new;
  end if;
  if not public.is_admin() then
    new.status          := old.status;
    new.is_admin        := old.is_admin;
    new.motivo_rejeicao := old.motivo_rejeicao;
  end if;
  return new;
end;
$$;

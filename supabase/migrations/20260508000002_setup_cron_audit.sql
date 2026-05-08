-- Habilitar pg_cron (disponível em todos os tiers Supabase)
create extension if not exists pg_cron with schema extensions;

-- Agendar invocação da Edge Function audit-orphan-leads a cada hora.
-- O service_role_key precisa ser configurado como custom GUC:
--   alter database postgres set "app.settings.service_role_key" = '<SERVICE_ROLE_KEY>';
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

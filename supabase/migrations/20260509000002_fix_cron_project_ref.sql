-- Corrige o cron schedule: substitui <PROJECT_REF> pelo ref real do projeto
select cron.unschedule('audit-orphan-leads-hourly');

select cron.schedule(
  'audit-orphan-leads-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://dtseqxfrajwwwmjmquuv.supabase.co/functions/v1/audit-orphan-leads',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    )
  );
  $$
);

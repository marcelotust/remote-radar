-- Vagas: remove as colunas legadas status/read de jobs (#74).
-- Rode SÓ DEPOIS de 0009 e, se quiser preservar seu histórico de
-- aplicado/descartado/lido, depois de rodar o backfill comentado em 0009.
-- A policy de update em jobs (jobs_authenticated_update / jobs_anon_update)
-- não é mais necessária a partir daqui — a leitura (select) continua.

drop policy if exists "jobs_anon_update"           on jobs;
drop policy if exists "jobs_authenticated_update"  on jobs;

alter table jobs
  drop column if exists status,
  drop column if exists read;

-- RLS: migrar de anon para authenticated (#72).
-- Aplicar SÓ DEPOIS que o login (#71) já estiver funcionando em produção —
-- depois de rodar isto, a anon key deixa de conseguir ler/escrever essas
-- tabelas, então a home fica sem dados até você logar.
-- `companies` não é tocada aqui: a tabela inteira é removida em #76.

drop policy if exists "jobs_anon_read"   on jobs;
drop policy if exists "jobs_anon_update" on jobs;
create policy "jobs_authenticated_read"   on jobs for select to authenticated using (true);
create policy "jobs_authenticated_update" on jobs for update to authenticated using (true) with check (true);

drop policy if exists "sources_anon_read"   on scraping_sources;
drop policy if exists "sources_anon_insert" on scraping_sources;
drop policy if exists "sources_anon_update" on scraping_sources;
drop policy if exists "sources_anon_delete" on scraping_sources;
create policy "sources_authenticated_read"   on scraping_sources for select to authenticated using (true);
create policy "sources_authenticated_insert" on scraping_sources for insert to authenticated with check (true);
create policy "sources_authenticated_update" on scraping_sources for update to authenticated using (true) with check (true);
create policy "sources_authenticated_delete" on scraping_sources for delete to authenticated using (true);

drop policy if exists "scoring_keywords_anon_read"   on scoring_keywords;
drop policy if exists "scoring_keywords_anon_insert" on scoring_keywords;
drop policy if exists "scoring_keywords_anon_update" on scoring_keywords;
drop policy if exists "scoring_keywords_anon_delete" on scoring_keywords;
create policy "scoring_keywords_authenticated_read"   on scoring_keywords for select to authenticated using (true);
create policy "scoring_keywords_authenticated_insert" on scoring_keywords for insert to authenticated with check (true);
create policy "scoring_keywords_authenticated_update" on scoring_keywords for update to authenticated using (true) with check (true);
create policy "scoring_keywords_authenticated_delete" on scoring_keywords for delete to authenticated using (true);

drop policy if exists "scoring_settings_anon_read"   on scoring_settings;
drop policy if exists "scoring_settings_anon_insert" on scoring_settings;
drop policy if exists "scoring_settings_anon_update" on scoring_settings;
create policy "scoring_settings_authenticated_read"   on scoring_settings for select to authenticated using (true);
create policy "scoring_settings_authenticated_insert" on scoring_settings for insert to authenticated with check (true);
create policy "scoring_settings_authenticated_update" on scoring_settings for update to authenticated using (true) with check (true);

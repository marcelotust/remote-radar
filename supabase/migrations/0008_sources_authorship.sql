-- Fontes: autor + permissão de edição (#73).
-- Overlaps with 0006 for scraping_sources policies — this migration's version
-- (with the ownership check) is the one that should end up applied; running
-- both is harmless (drop-if-exists + recreate), just redundant.

alter table scraping_sources
  add column if not exists created_by       uuid references auth.users(id),
  add column if not exists created_by_email text;

drop policy if exists "sources_anon_read"            on scraping_sources;
drop policy if exists "sources_anon_insert"          on scraping_sources;
drop policy if exists "sources_anon_update"           on scraping_sources;
drop policy if exists "sources_anon_delete"           on scraping_sources;
drop policy if exists "sources_authenticated_read"    on scraping_sources;
drop policy if exists "sources_authenticated_insert"  on scraping_sources;
drop policy if exists "sources_authenticated_update"  on scraping_sources;
drop policy if exists "sources_authenticated_delete"  on scraping_sources;

create policy "sources_authenticated_read"   on scraping_sources for select to authenticated using (true);
create policy "sources_authenticated_insert" on scraping_sources for insert to authenticated with check (true);
create policy "sources_authenticated_update" on scraping_sources for update to authenticated
  using (created_by = auth.uid() or created_by is null)
  with check (created_by = auth.uid() or created_by is null);
create policy "sources_authenticated_delete" on scraping_sources for delete to authenticated
  using (created_by = auth.uid() or created_by is null);

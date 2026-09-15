-- Relevância (score) calculada por usuário (#75).
-- Overlaps with 0002/0006 for scoring_keywords/scoring_settings policies —
-- this migration's version (own-row write checks) is the one that should
-- end up applied.

drop policy if exists "scoring_keywords_anon_read"            on scoring_keywords;
drop policy if exists "scoring_keywords_anon_insert"          on scoring_keywords;
drop policy if exists "scoring_keywords_anon_update"          on scoring_keywords;
drop policy if exists "scoring_keywords_anon_delete"          on scoring_keywords;
drop policy if exists "scoring_keywords_authenticated_read"   on scoring_keywords;
drop policy if exists "scoring_keywords_authenticated_insert" on scoring_keywords;
drop policy if exists "scoring_keywords_authenticated_update" on scoring_keywords;
drop policy if exists "scoring_keywords_authenticated_delete" on scoring_keywords;

create policy "scoring_keywords_authenticated_read" on scoring_keywords for select to authenticated
  using (user_id = auth.uid() or user_id is null);
create policy "scoring_keywords_own_insert" on scoring_keywords for insert to authenticated with check (user_id = auth.uid());
create policy "scoring_keywords_own_update" on scoring_keywords for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "scoring_keywords_own_delete" on scoring_keywords for delete to authenticated using (user_id = auth.uid());

drop policy if exists "scoring_settings_anon_read"            on scoring_settings;
drop policy if exists "scoring_settings_anon_insert"          on scoring_settings;
drop policy if exists "scoring_settings_anon_update"          on scoring_settings;
drop policy if exists "scoring_settings_authenticated_read"   on scoring_settings;
drop policy if exists "scoring_settings_authenticated_insert" on scoring_settings;
drop policy if exists "scoring_settings_authenticated_update" on scoring_settings;

create policy "scoring_settings_authenticated_read" on scoring_settings for select to authenticated
  using (user_id = auth.uid() or user_id is null);
create policy "scoring_settings_own_insert" on scoring_settings for insert to authenticated with check (user_id = auth.uid());
create policy "scoring_settings_own_update" on scoring_settings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

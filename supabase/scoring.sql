-- Remote Radar — Scoring config (issue #43), idempotent.
--
-- Safe to run any number of times, regardless of current state (tables present
-- or not, policies present or not, already seeded or not). Unlike schema.sql,
-- this script guards the policies with `drop policy if exists` so re-running it
-- never errors on "policy already exists".
--
-- Use this when you only need to (re)provision the scoring tables — e.g. on an
-- existing project where the rest of the schema already lives. The canonical
-- full schema is still supabase/schema.sql (run that on a fresh project).

create table if not exists scoring_keywords (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid,
  term       text not null,
  weight     int  not null default 1,
  is_veto    boolean not null default false,
  created_at timestamptz default now(),
  unique nulls not distinct (user_id, term)
);

create table if not exists scoring_settings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid,
  high_threshold   int not null default 4,
  medium_threshold int not null default 1,
  created_at       timestamptz default now(),
  unique nulls not distinct (user_id)
);

alter table scoring_keywords enable row level security;
alter table scoring_settings enable row level security;

-- drop-then-create keeps the policies idempotent
drop policy if exists "scoring_keywords_anon_read"   on scoring_keywords;
drop policy if exists "scoring_keywords_anon_insert" on scoring_keywords;
drop policy if exists "scoring_keywords_anon_update" on scoring_keywords;
drop policy if exists "scoring_keywords_anon_delete" on scoring_keywords;
create policy "scoring_keywords_anon_read"   on scoring_keywords for select to anon using (true);
create policy "scoring_keywords_anon_insert" on scoring_keywords for insert to anon with check (true);
create policy "scoring_keywords_anon_update" on scoring_keywords for update to anon using (true) with check (true);
create policy "scoring_keywords_anon_delete" on scoring_keywords for delete to anon using (true);

drop policy if exists "scoring_settings_anon_read"   on scoring_settings;
drop policy if exists "scoring_settings_anon_insert" on scoring_settings;
drop policy if exists "scoring_settings_anon_update" on scoring_settings;
create policy "scoring_settings_anon_read"   on scoring_settings for select to anon using (true);
create policy "scoring_settings_anon_insert" on scoring_settings for insert to anon with check (true);
create policy "scoring_settings_anon_update" on scoring_settings for update to anon using (true) with check (true);

-- Default global config seed (won't duplicate).
insert into scoring_settings (user_id, high_threshold, medium_threshold)
values (null, 4, 1)
on conflict do nothing;

insert into scoring_keywords (user_id, term, weight, is_veto) values
  (null, 'presencial', 0, true),
  (null, 'híbrido', 0, true),
  (null, 'hybrid', 0, true),
  (null, 'on-site', 0, true),
  (null, 'onsite', 0, true),
  (null, 'java', 0, true),
  (null, 'php', 0, true),
  (null, 'cobol', 0, true),
  (null, '.net', 0, true),
  (null, 'c#', 0, true),
  (null, 'golang', 0, true),
  (null, 'react', 2, false),
  (null, 'remote', 2, false),
  (null, 'worldwide remote', 2, false),
  (null, 'remote worldwide', 2, false),
  (null, '100% remote', 2, false),
  (null, 'frontend', 2, false),
  (null, 'front-end', 2, false),
  (null, 'typescript', 2, false),
  (null, 'reactjs', 1, false),
  (null, 'next.js', 1, false),
  (null, 'nextjs', 1, false),
  (null, 'tailwind', 1, false),
  (null, 'node', 1, false),
  (null, 'rails', 1, false),
  (null, 'css', 1, false),
  (null, 'javascript', 1, false),
  (null, 'js', 1, false),
  (null, 'figma', 1, false),
  (null, 'ux', 1, false),
  (null, 'ui', 1, false),
  (null, 'hotwire', 1, false),
  (null, 'worldwide', 1, false)
on conflict do nothing;

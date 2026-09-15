-- Remote Radar — Supabase schema
-- Run this in the Supabase SQL editor for a fresh project.
-- Status model reflects issue #7: `status` is user-action only (none/applied/
-- dismissed) and read/unread is a separate `read` boolean column.

create table if not exists jobs (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  company     text not null,
  url         text not null unique,
  location    text,
  description text,
  posted_at   timestamptz,
  scraped_at  timestamptz default now(),
  status      text not null default 'none'
              check (status in ('none', 'applied', 'dismissed')),
  read        boolean not null default false,
  source_url  text,
  relevance_score int,
  relevance_level text
              check (relevance_level in ('high', 'medium', 'low', 'negative'))
);

create table if not exists scraping_sources (
  id                  uuid primary key default gen_random_uuid(),
  url                 text not null unique,
  label               text not null,
  is_active           boolean not null default true,
  created_at          timestamptz default now(),
  last_run_at         timestamptz,
  last_run_jobs_added int,
  last_run_status     text check (last_run_status in ('success', 'error')),
  last_run_error      text
);

-- Row Level Security ---------------------------------------------------------
-- The app uses the anon key from the browser. Policy intent:
--   jobs              → anon read + update (status / read toggles)
--   scraping_sources  → anon read + write (source CRUD)

alter table jobs enable row level security;
alter table scraping_sources enable row level security;

create policy "jobs_anon_read"   on jobs for select to anon using (true);
create policy "jobs_anon_update" on jobs for update to anon using (true) with check (true);

create policy "sources_anon_read"   on scraping_sources for select to anon using (true);
create policy "sources_anon_insert" on scraping_sources for insert to anon with check (true);
create policy "sources_anon_update" on scraping_sources for update to anon using (true) with check (true);
create policy "sources_anon_delete" on scraping_sources for delete to anon using (true);

-- Scoring config (issue #43) ------------------------------------------------
-- Weighted keywords + hard vetoes. `user_id` is nullable: null = global/default
-- config. Modeled for future per-user config (filter by user_id, fall back to
-- the global row). `nulls not distinct` keeps a single global row per term.
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

create policy "scoring_keywords_anon_read"   on scoring_keywords for select to anon using (true);
create policy "scoring_keywords_anon_insert" on scoring_keywords for insert to anon with check (true);
create policy "scoring_keywords_anon_update" on scoring_keywords for update to anon using (true) with check (true);
create policy "scoring_keywords_anon_delete" on scoring_keywords for delete to anon using (true);

create policy "scoring_settings_anon_read"   on scoring_settings for select to anon using (true);
create policy "scoring_settings_anon_insert" on scoring_settings for insert to anon with check (true);
create policy "scoring_settings_anon_update" on scoring_settings for update to anon using (true) with check (true);

-- Default global config seed.
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

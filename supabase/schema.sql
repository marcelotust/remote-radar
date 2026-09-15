-- Remote Radar — Supabase schema
-- Run this in the Supabase SQL editor for a fresh project.
-- Status model reflects issue #7: `status` is user-action only (none/applied/
-- dismissed) and read/unread is a separate `read` boolean column.
-- `jobs.status`/`jobs.read` below are vestigial (#74): status/read are now
-- tracked per user in `job_user_state`, further down. Kept on a fresh install
-- only so the column defaults still exist; see 0009/0010 in migrations/ for
-- how an existing database transitions off them.

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

-- Per-user job status/read (#74). Shared job list, independent tracking.
create table if not exists job_user_state (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id),
  job_id     uuid not null references jobs(id) on delete cascade,
  status     text not null default 'none'
             check (status in ('none', 'applied', 'dismissed')),
  read       boolean not null default false,
  created_at timestamptz default now(),
  unique (user_id, job_id)
);

alter table job_user_state enable row level security;

create policy "job_user_state_own_read"   on job_user_state for select to authenticated using (user_id = auth.uid());
create policy "job_user_state_own_insert" on job_user_state for insert to authenticated with check (user_id = auth.uid());
create policy "job_user_state_own_update" on job_user_state for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists scraping_sources (
  id                  uuid primary key default gen_random_uuid(),
  url                 text not null unique,
  label               text not null,
  is_active           boolean not null default true,
  created_at          timestamptz default now(),
  created_by          uuid references auth.users(id),
  created_by_email    text,
  last_run_at         timestamptz,
  last_run_jobs_added int,
  last_run_status     text check (last_run_status in ('success', 'error')),
  last_run_error      text
);

-- Row Level Security ---------------------------------------------------------
-- The browser client only ever holds a signed-in session (see #71); the anon
-- key alone can't read or write anything past the allowlist RPC below. Policy
-- intent:
--   jobs              → authenticated read + update (status / read toggles)
--   scraping_sources  → authenticated read + write (source CRUD)

alter table jobs enable row level security;
alter table scraping_sources enable row level security;

create policy "jobs_authenticated_read"   on jobs for select to authenticated using (true);
create policy "jobs_authenticated_update" on jobs for update to authenticated using (true) with check (true);

-- Sources are shared (everyone reads all of them), but only the creator can
-- edit/delete their own. Legacy rows seeded before this column existed have
-- created_by = null — treated as editable by anyone rather than locked
-- forever (#73).
create policy "sources_authenticated_read"   on scraping_sources for select to authenticated using (true);
create policy "sources_authenticated_insert" on scraping_sources for insert to authenticated with check (true);
create policy "sources_authenticated_update" on scraping_sources for update to authenticated
  using (created_by = auth.uid() or created_by is null)
  with check (created_by = auth.uid() or created_by is null);
create policy "sources_authenticated_delete" on scraping_sources for delete to authenticated
  using (created_by = auth.uid() or created_by is null);

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

create policy "scoring_keywords_authenticated_read"   on scoring_keywords for select to authenticated using (true);
create policy "scoring_keywords_authenticated_insert" on scoring_keywords for insert to authenticated with check (true);
create policy "scoring_keywords_authenticated_update" on scoring_keywords for update to authenticated using (true) with check (true);
create policy "scoring_keywords_authenticated_delete" on scoring_keywords for delete to authenticated using (true);

create policy "scoring_settings_authenticated_read"   on scoring_settings for select to authenticated using (true);
create policy "scoring_settings_authenticated_insert" on scoring_settings for insert to authenticated with check (true);
create policy "scoring_settings_authenticated_update" on scoring_settings for update to authenticated using (true) with check (true);

-- Allowlist + magic-link auth (#71) ------------------------------------------
-- No UI to manage this yet: add a friend with
--   insert into allowed_users (email) values ('amigo@example.com');
create table if not exists allowed_users (
  email      text primary key,
  created_at timestamptz default now()
);

alter table allowed_users enable row level security;
-- No select policy: the table is never read directly by any client role,
-- only through the security-definer RPC below (keeps the email list private).

create or replace function is_email_allowed(check_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from allowed_users where email = lower(check_email)
  );
$$;

grant execute on function is_email_allowed(text) to anon, authenticated;

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

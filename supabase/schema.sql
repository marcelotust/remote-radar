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
  source_url  text
);

create table if not exists companies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  website       text,
  notes         text,
  remote_brazil text not null default 'unknown'
                check (remote_brazil in ('unknown', 'yes', 'no')),
  created_at    timestamptz default now()
);

create table if not exists scraping_sources (
  id         uuid primary key default gen_random_uuid(),
  url        text not null unique,
  label      text not null,
  is_active  boolean not null default true,
  created_at timestamptz default now()
);

-- Row Level Security ---------------------------------------------------------
-- The app uses the anon key from the browser. Policy intent:
--   jobs              → anon read + update (status / read toggles)
--   companies         → anon read + write (wishlist CRUD)
--   scraping_sources  → anon read + write (source CRUD)

alter table jobs enable row level security;
alter table companies enable row level security;
alter table scraping_sources enable row level security;

create policy "jobs_anon_read"   on jobs for select to anon using (true);
create policy "jobs_anon_update" on jobs for update to anon using (true) with check (true);

create policy "companies_anon_read"   on companies for select to anon using (true);
create policy "companies_anon_insert" on companies for insert to anon with check (true);
create policy "companies_anon_update" on companies for update to anon using (true) with check (true);
create policy "companies_anon_delete" on companies for delete to anon using (true);

create policy "sources_anon_read"   on scraping_sources for select to anon using (true);
create policy "sources_anon_insert" on scraping_sources for insert to anon with check (true);
create policy "sources_anon_update" on scraping_sources for update to anon using (true) with check (true);
create policy "sources_anon_delete" on scraping_sources for delete to anon using (true);

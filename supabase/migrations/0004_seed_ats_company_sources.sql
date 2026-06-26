-- Seed per-company ATS sources and retire the generic ATS roots (issue #25).
-- Lever/Greenhouse roots (jobs.lever.co, boards.greenhouse.io) list no jobs
-- without a company slug, so they only ever time out. ATS adapters resolve by
-- host (scraper/adapters/index.ts) and hit the public JSON APIs per company:
--   Lever      api.lever.co/v0/postings/<slug>?mode=json
--   Greenhouse boards-api.greenhouse.io/v1/boards/<slug>/jobs?content=true
-- Adapters emit remote roles only. See docs/scraper-sources.md for how to add
-- a new ATS company target.
-- Idempotent: re-running re-disables the roots and skips existing seed rows.

-- Retire the generic ATS roots (cannot resolve without a slug).
update scraping_sources set is_active = false
where url in ('https://jobs.lever.co', 'https://boards.greenhouse.io');

-- Seed per-company ATS targets. One row per company; the adapter resolves by host.
-- Slugs verified against the live APIs (each returns remote roles as of 2026-06-26).
insert into scraping_sources (url, label, is_active) values
  ('https://boards.greenhouse.io/gitlab', 'GitLab (Greenhouse)', true),
  ('https://boards.greenhouse.io/dropbox', 'Dropbox (Greenhouse)', true),
  ('https://jobs.lever.co/spotify', 'Spotify (Lever)', true),
  ('https://jobs.lever.co/swordhealth', 'Sword Health (Lever)', true)
on conflict (url) do nothing;

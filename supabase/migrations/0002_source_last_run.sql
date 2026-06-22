-- Per-source metadata about the most recent scraper run (issue #20).
alter table scraping_sources add column if not exists last_run_at         timestamptz;
alter table scraping_sources add column if not exists last_run_jobs_added int;
alter table scraping_sources add column if not exists last_run_status     text
  check (last_run_status in ('success', 'error'));
alter table scraping_sources add column if not exists last_run_error      text;

-- Persist scraper-computed relevance so the app can read it without recomputing.
alter table jobs add column if not exists relevance_score int;
alter table jobs add column if not exists relevance_level text
  check (relevance_level in ('high', 'medium', 'low', 'negative'));

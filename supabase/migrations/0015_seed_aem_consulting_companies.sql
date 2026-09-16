-- Seeds the one ATS-verified source from the issue #95 AEM consulting/agency
-- list (see docs/consulting-directory.md). The other 99 are GSI/enterprise-
-- scale firms with no scrapeable Lever/Greenhouse/Ashby board — see that doc
-- for why, and for the ownership note about fabiotust@gmail.com's list.

insert into scraping_sources (url, label, is_active) values
  ('https://boards.greenhouse.io/hugeinc', 'Huge (Greenhouse)', true)
on conflict (url) do nothing;

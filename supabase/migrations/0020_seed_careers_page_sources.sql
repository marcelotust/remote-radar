-- Seeds sources from a list of company careers pages. Each page was resolved
-- to its underlying ATS and only boards whose public API answered (and whose
-- jobs belong to that company) are inserted, so the ashby / greenhouse /
-- lever / workable adapters pick them up. Careers pages that need a rendered/JSON-LD
-- scrape or sit on an ATS without an adapter are listed in
-- docs/scraper-sources.md instead.

insert into scraping_sources (url, label, is_active, company_type) values
  ('https://jobs.ashbyhq.com/supabase', 'Supabase (Ashby)', true, 'startup'),
  ('https://jobs.ashbyhq.com/rerun', 'Rerun (Ashby)', true, 'startup'),
  ('https://jobs.ashbyhq.com/checkly', 'Checkly (Ashby)', true, 'startup'),
  ('https://jobs.ashbyhq.com/railway', 'Railway (Ashby)', true, 'startup'),
  ('https://jobs.ashbyhq.com/posthog', 'PostHog (Ashby)', true, 'startup'),
  ('https://jobs.ashbyhq.com/kit', 'Kit (Ashby)', true, 'startup'),
  ('https://jobs.ashbyhq.com/atticus', 'Atticus (Ashby)', true, 'startup'),
  ('https://jobs.ashbyhq.com/xbowcareers', 'XBOW (Ashby)', true, 'startup'),
  ('https://jobs.ashbyhq.com/Nango', 'Nango (Ashby)', true, 'startup'),
  ('https://jobs.ashbyhq.com/kamino', 'Kamino (Ashby)', true, 'startup'),
  ('https://boards.greenhouse.io/enveritas', 'Enveritas (Greenhouse)', true, 'startup'),
  ('https://boards.greenhouse.io/stackblitz', 'StackBlitz (Greenhouse)', true, 'startup'),
  ('https://jobs.lever.co/offchainlabs', 'Offchain Labs (Lever)', true, 'startup'),
  ('https://apply.workable.com/pitch-software', 'Pitch (Workable)', true, 'startup'),
  ('https://apply.workable.com/seeq', 'Seeq (Workable)', true, 'produto')
on conflict (url) do nothing;

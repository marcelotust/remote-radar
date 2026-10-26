-- Reset the shared job pool and prune sources that never yielded a job.
--
-- By October 2026 the pool held ~7,550 rows, ~70% of them not software roles,
-- and the feed had been frozen on 2026-09-14 (an unordered select hit
-- PostgREST's 1,000-row cap). The scraper now only ingests software-
-- development roles (scraper/roleFilter.ts), so the pool starts over and the
-- next run re-collects whatever is still open.
--
-- ORDER MATTERS: apply only after the new scraper is on main, then trigger the
-- Daily Scraper workflow by hand. Run it before that and the old scraper
-- refills the pool unfiltered on its next scheduled run.
--
-- Jobs someone interacted with are kept: rows referenced by job_user_state,
-- plus legacy state in the vestigial jobs.status/jobs.read columns (so this
-- must run before 0010 drops them).

delete from jobs j
where not exists (select 1 from job_user_state s where s.job_id = j.id)
  and j.status = 'none'
  and j.read = false;

-- Amplitude moved its board from Greenhouse (404 since September) to Ashby.
update scraping_sources
set url = 'https://jobs.ashbyhq.com/amplitude', label = 'Amplitude (Ashby)'
where url = 'https://boards.greenhouse.io/amplitude';

-- Non-ATS boards that never yielded a single job: the generic JSON-LD adapter
-- finds nothing on them, or they block headless Chromium. ATS boards (Ashby/
-- Greenhouse/Lever) with no current remote openings stay active: they cost
-- one API call each and may open roles later. Details: docs/scraper-sources.md.
-- Idempotent: re-running just re-applies is_active = false.
update scraping_sources set is_active = false where url in (
  'https://theaijobboard.com',
  'https://builtin.com',
  'https://www.jobnagringa.com.br',
  'https://jobspresso.co',
  'https://jsremotely.com',
  'https://justremote.co',
  'https://remotar.com.br',
  'https://remotecircle.com',
  'https://remotewoman.com',
  'https://workinestonia.com/job'
);

-- Job age and closed-job detection.
--
-- The feed only knew when a job was first scraped, so a posting published two
-- months ago looked brand new the day it entered the pool, and a posting the
-- company had taken down stayed in the feed forever. Two additions:
--
-- * last_seen_at: stamped by the scraper every run for each job the source
--   still lists. The feed hides jobs not seen for a few days (they closed, or
--   their source stopped being scraped).
-- * listed_at: the date the feed ranks and windows by, the real publication
--   date (posted_at, which the scraper now stores) or, for sources that expose
--   none, the day the job was first scraped.
--
-- Purely additive: the previous scraper and app keep working while this is
-- applied, so run it BEFORE merging the code that reads these columns.

alter table jobs add column if not exists last_seen_at timestamptz not null default now();

-- Existing rows get their first-scrape day, so jobs the scraper no longer
-- finds age out of the feed instead of looking freshly seen.
update jobs set last_seen_at = scraped_at where scraped_at is not null;

alter table jobs add column if not exists listed_at timestamptz
  generated always as (coalesce(posted_at, scraped_at)) stored;

create index if not exists jobs_listed_at_idx on jobs (listed_at desc);

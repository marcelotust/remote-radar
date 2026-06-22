-- Remote Radar — example seed data
-- Mirrors src/data/mockData.ts so a fresh database has something to show.
-- Safe to re-run: uses ON CONFLICT / NOT EXISTS guards.

-- Companies -----------------------------------------------------------------
insert into companies (name, website, notes, remote_brazil)
select v.name, v.website, v.notes, v.remote_brazil
from (values
  ('Stripe',     'https://stripe.com',     'Strong eng culture, fully remote', 'yes'),
  ('Cloudflare', 'https://cloudflare.com',  null,                              'unknown'),
  ('Acme Corp',  null,                      'Only hires US-based',             'no')
) as v(name, website, notes, remote_brazil)
where not exists (select 1 from companies c where c.name = v.name);

-- Scraping sources ----------------------------------------------------------
insert into scraping_sources (url, label, is_active) values
  ('https://jobs.lever.co',        'Lever Jobs', true),
  ('https://boards.greenhouse.io', 'Greenhouse', true)
on conflict (url) do nothing;

-- Jobs ----------------------------------------------------------------------
insert into jobs (title, company, url, location, description, posted_at, status, read, source_url) values
  (
    'Senior Frontend Engineer', 'Stripe', 'https://stripe.com/jobs/1', 'Remote',
    'We are looking for a React TypeScript engineer with Next.js experience.',
    '2026-06-19T00:00:00Z', 'none', false, 'https://jobs.lever.co'
  ),
  (
    'Full Stack Developer', 'Cloudflare', 'https://cloudflare.com/jobs/2', 'Remote',
    'PHP and Java backend with some frontend work.',
    '2026-06-18T00:00:00Z', 'none', false, 'https://boards.greenhouse.io'
  ),
  (
    'React Developer', 'Tech Startup', 'https://techstartup.com/jobs/3', 'Presencial São Paulo',
    'React frontend developer. Must work presencial.',
    '2026-06-17T00:00:00Z', 'none', true, 'https://jobs.lever.co'
  )
on conflict (url) do nothing;

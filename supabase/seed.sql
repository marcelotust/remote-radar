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
  -- Existentes
  ('https://jobs.lever.co',        'Lever Jobs', true),
  ('https://boards.greenhouse.io', 'Greenhouse', true),
  -- Agregador Generalista
  ('https://www.linkedin.com',     'LinkedIn',     true),
  ('https://www.indeed.com',       'Indeed',       true),
  ('https://www.glassdoor.com',    'Glassdoor',    true),
  ('https://www.ziprecruiter.com', 'ZipRecruiter', true),
  ('https://www.jobot.com',        'Jobot',        true),
  -- Tech e Startups
  ('https://wellfound.com',           'Wellfound',         true),
  ('https://otta.com',                'Otta',              true),
  ('https://builtin.com',             'Built In',          true),
  ('https://www.dice.com',            'Dice',              true),
  ('https://www.workatstartup.com',   'Work at a Startup', true),
  -- Exclusivo Remoto
  ('https://remoteok.com/api',        'Remote OK',        true),
  ('https://weworkremotely.com',      'We Work Remotely', true),
  ('https://remotive.com/api/remote-jobs', 'Remotive',    true),
  ('https://jobspresso.co',           'Jobspresso',       true),
  ('https://www.workingnomads.com/jobs', 'Working Nomads', true),
  ('https://justremote.co',           'JustRemote',       true),
  ('https://euremotejobs.com/jobs/',  'EU Remote Jobs',   true),
  -- Nichos Específicos
  ('https://jsremotely.com',          'JS Remotely',     true),
  ('https://theaijobboard.com',       'AI Jobs',         true),
  ('https://remotewoman.com',         'Remote Woman',    true),
  ('https://remotecircle.com',        'Remote Circle',   true),
  ('https://vanhack.com',             'VanHack',         true),
  ('https://workinestonia.com/job',   'Work In Estonia', true),
  -- Marketplaces e Redes de Talentos
  ('https://www.toptal.com',          'Toptal',          true),
  ('https://www.turing.com',          'Turing',          true),
  ('https://arc.dev',                 'Arc.dev',         true),
  ('https://jobbers.io',              'Jobbers.io',      true),
  ('https://lemon.io',                'Lemon.io',        true),
  ('https://clouddevs.com',           'CloudDevs',       true),
  ('https://gun.io',                  'Gun.io',          true),
  ('https://andela.com',              'Andela',          true),
  ('https://www.upwork.com',          'Upwork',          true),
  ('https://www.fiverr.com',          'Fiverr',          true),
  ('https://www.usebraintrust.com',   'Braintrust',      true),
  ('https://hubstafftalent.net',      'Hubstaff Talent', true),
  -- Brasil e América Latina
  ('https://revelo.com.br',                'Revelo',          true),
  ('https://www.tecla.io',                 'Tecla',           true),
  ('https://onstrider.com',                'Strider',         true),
  ('https://www.bairesdev.com',            'BairesDev',       true),
  ('https://remotar.com.br',               'Remotar',         true),
  ('https://www.jobnagringa.com.br',       'JobNaGringa',     true),
  ('https://www.workana.com',              'Workana',         true),
  ('https://github.com/frontendbr/vagas',  'FrontendBR Vagas', true),
  ('https://github.com/backend-br/vagas',  'BackendBR Vagas',  true)
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

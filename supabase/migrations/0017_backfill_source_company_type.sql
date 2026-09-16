-- Backfills company_type (#109, added in 0016) on the sources already in
-- production, classified from the same research that produced
-- docs/company-directory.md (#93), docs/react-ecosystem-directory.md (#94),
-- and docs/consulting-directory.md (#95). Anything not matched here (the
-- original generalist/aggregator boards seeded before this categorization
-- existed, plus any source a user adds after this migration runs) stays
-- null/unclassified.

-- Startups/scale-ups from #93 and #94 (all Ashby/Greenhouse rows inserted
-- by 0013 and 0014 — every jobs.ashbyhq.com source plus the specific
-- boards.greenhouse.io slugs from those two migrations).
update scraping_sources
set company_type = 'startup'
where url like 'https://jobs.ashbyhq.com/%'
  or url in (
    'https://boards.greenhouse.io/vercel',
    'https://boards.greenhouse.io/sourcegraph91',
    'https://boards.greenhouse.io/launchdarkly',
    'https://boards.greenhouse.io/descript',
    'https://boards.greenhouse.io/mixpanel',
    'https://boards.greenhouse.io/amplitude',
    'https://boards.greenhouse.io/soloioinc',
    'https://boards.greenhouse.io/fivetran',
    'https://boards.greenhouse.io/buildkite',
    'https://boards.greenhouse.io/assemblyai',
    'https://boards.greenhouse.io/gremlin'
  );

-- Consultancy from #95.
update scraping_sources
set company_type = 'consultoria'
where url = 'https://boards.greenhouse.io/hugeinc';

-- Established product companies wired directly as per-company ATS targets
-- (0004), predating the #93/#94 startup lists — GitLab, Dropbox, Spotify,
-- Sword Health are not early-stage startups.
update scraping_sources
set company_type = 'produto'
where url in (
  'https://boards.greenhouse.io/gitlab',
  'https://boards.greenhouse.io/dropbox',
  'https://jobs.lever.co/spotify',
  'https://jobs.lever.co/swordhealth'
);

-- Generalist/aggregator/marketplace boards seeded before company_type
-- existed — multi-company feeds rather than a single employer.
update scraping_sources
set company_type = 'agregador'
where url in (
  'https://jobs.lever.co',
  'https://boards.greenhouse.io',
  'https://www.linkedin.com',
  'https://www.indeed.com',
  'https://www.glassdoor.com',
  'https://www.ziprecruiter.com',
  'https://www.jobot.com',
  'https://wellfound.com',
  'https://otta.com',
  'https://builtin.com',
  'https://www.dice.com',
  'https://www.workatstartup.com',
  'https://remoteok.com',
  'https://weworkremotely.com',
  'https://remotive.com/api/remote-jobs',
  'https://jobspresso.co',
  'https://www.workingnomads.com',
  'https://justremote.co',
  'https://euremotejobs.com',
  'https://jsremotely.com',
  'https://theaijobboard.com',
  'https://remotewoman.com',
  'https://remotecircle.com',
  'https://vanhack.com',
  'https://workinestonia.com/job',
  'https://www.toptal.com',
  'https://www.turing.com',
  'https://arc.dev',
  'https://jobbers.io',
  'https://lemon.io',
  'https://clouddevs.com',
  'https://gun.io',
  'https://andela.com',
  'https://www.upwork.com',
  'https://www.fiverr.com',
  'https://www.usebraintrust.com',
  'https://hubstafftalent.net',
  'https://revelo.com.br',
  'https://www.tecla.io',
  'https://onstrider.com',
  'https://www.bairesdev.com',
  'https://remotar.com.br',
  'https://www.jobnagringa.com.br',
  'https://www.workana.com',
  'https://github.com/frontendbr/vagas',
  'https://github.com/backend-br/vagas'
);

-- Disable unviable scraping sources (issue #26).
-- Aggregators/marketplaces/portals that require login, expose no public job
-- board, are freelance-only, or are protected by heavy anti-bot + ToS. They only
-- ever time out, so take them out of the scrape loop (fetchActiveSources filters
-- is_active = true). Classification + reasons: docs/scraper-sources.md.
-- Idempotent: re-running just re-applies is_active = false.

-- Login / account required
update scraping_sources set is_active = false where url in (
  'https://www.linkedin.com',
  'https://www.glassdoor.com',
  'https://wellfound.com',
  'https://otta.com',
  'https://www.workatstartup.com',
  'https://vanhack.com',
  'https://arc.dev',
  'https://www.turing.com'
);

-- Talent network — no public job board (they match you; you don't browse)
update scraping_sources set is_active = false where url in (
  'https://www.toptal.com',
  'https://andela.com',
  'https://www.usebraintrust.com',
  'https://gun.io',
  'https://lemon.io',
  'https://clouddevs.com',
  'https://hubstafftalent.net',
  'https://jobbers.io',
  'https://revelo.com.br',
  'https://www.tecla.io',
  'https://onstrider.com',
  'https://www.bairesdev.com'
);

-- Freelance gig marketplace — not employment listings
update scraping_sources set is_active = false where url in (
  'https://www.upwork.com',
  'https://www.fiverr.com',
  'https://www.workana.com'
);

-- Heavy anti-bot (Cloudflare / captcha) + ToS-restricted
update scraping_sources set is_active = false where url in (
  'https://www.indeed.com',
  'https://www.ziprecruiter.com',
  'https://www.dice.com',
  'https://www.jobot.com'
);

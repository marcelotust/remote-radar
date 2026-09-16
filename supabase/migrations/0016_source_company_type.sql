-- Company-type tag for scraping sources (#109): lets a source be labeled as
-- a startup/scale-up, a consultancy/agency, an established product company,
-- or a generic aggregator board — so the source list (and, later, filters)
-- can distinguish the very different profiles mixed into scraping_sources
-- (#93/#94 startups, #95 consultancies, the original aggregator boards).
-- Nullable: existing/legacy sources are unclassified until retrofitted (see
-- 0017) or edited.

alter table scraping_sources
  add column if not exists company_type text
    check (company_type in ('startup', 'consultoria', 'produto', 'agregador'));

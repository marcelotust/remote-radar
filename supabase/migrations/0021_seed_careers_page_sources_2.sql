-- Follow-up to 0020: sources unlocked by the Pinpoint and Rippling adapters,
-- plus fal.ai (Ashby slug is "fal-ai"). Verified against each public API.

insert into scraping_sources (url, label, is_active, company_type) values
  ('https://jobs.ashbyhq.com/fal-ai', 'fal.ai (Ashby)', true, 'startup'),
  ('https://safetywing.pinpointhq.com', 'SafetyWing (Pinpoint)', true, 'startup'),
  ('https://ats.rippling.com/expo/jobs', 'Expo (Rippling)', true, 'startup')
on conflict (url) do nothing;

-- Seeds ATS-verified sources from the issue #94 React/Next.js/TypeScript
-- ecosystem company list (see docs/react-ecosystem-directory.md for the full
-- 80-company list and how each ATS was resolved/verified). Same approach as
-- 0013: only rows with a confirmed working public ATS API are inserted.

insert into scraping_sources (url, label, is_active) values
  ('https://jobs.ashbyhq.com/sentry', 'Sentry (Ashby)', true),
  ('https://jobs.ashbyhq.com/Speakeasy', 'Speakeasy (Ashby)', true),
  ('https://jobs.ashbyhq.com/GitBook', 'GitBook (Ashby)', true),
  ('https://jobs.ashbyhq.com/readme', 'ReadMe (Ashby)', true),
  ('https://jobs.ashbyhq.com/roboflow', 'Roboflow (Ashby)', true),
  ('https://jobs.ashbyhq.com/vapi', 'Vapi (Ashby)', true),
  ('https://jobs.ashbyhq.com/bland', 'Bland AI (Ashby)', true),
  ('https://jobs.ashbyhq.com/cartesia', 'Cartesia (Ashby)', true),
  ('https://jobs.ashbyhq.com/photoroom', 'Photoroom (Ashby)', true),
  ('https://jobs.ashbyhq.com/livekit', 'LiveKit (Ashby)', true),
  ('https://jobs.ashbyhq.com/lightdash', 'Lightdash (Ashby)', true),
  ('https://jobs.ashbyhq.com/kong', 'Kong (Ashby)', true),
  ('https://boards.greenhouse.io/vercel', 'Vercel (Greenhouse)', true),
  ('https://boards.greenhouse.io/sourcegraph91', 'Sourcegraph (Greenhouse)', true),
  ('https://boards.greenhouse.io/launchdarkly', 'LaunchDarkly (Greenhouse)', true),
  ('https://boards.greenhouse.io/descript', 'Descript (Greenhouse)', true),
  ('https://boards.greenhouse.io/mixpanel', 'Mixpanel (Greenhouse)', true),
  ('https://boards.greenhouse.io/amplitude', 'Amplitude (Greenhouse)', true),
  ('https://boards.greenhouse.io/soloioinc', 'Solo.io (Greenhouse)', true)
on conflict (url) do nothing;

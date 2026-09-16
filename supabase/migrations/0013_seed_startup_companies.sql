-- Seeds ATS-verified sources from the issue #93 company list (see
-- docs/company-directory.md for the full 100-company list and how the ATS
-- for each was resolved/verified). Only rows with a confirmed working public
-- ATS API are inserted here — most of the issue's 100 careers URLs are
-- marketing pages with no detectable ATS and are intentionally left out.

insert into scraping_sources (url, label, is_active) values
  ('https://jobs.ashbyhq.com/supabase', 'Supabase (Ashby)', true),
  ('https://jobs.ashbyhq.com/Clerk', 'Clerk (Ashby)', true),
  ('https://jobs.ashbyhq.com/render', 'Render (Ashby)', true),
  ('https://jobs.ashbyhq.com/moderntreasury', 'Modern Treasury (Ashby)', true),
  ('https://jobs.ashbyhq.com/inngest', 'Inngest (Ashby)', true),
  ('https://jobs.ashbyhq.com/langchain', 'LangChain (Ashby)', true),
  ('https://jobs.ashbyhq.com/pinecone', 'Pinecone (Ashby)', true),
  ('https://jobs.ashbyhq.com/Close', 'Close (Ashby)', true),
  ('https://jobs.ashbyhq.com/knock', 'Knock (Ashby)', true),
  ('https://jobs.ashbyhq.com/merge', 'Merge (Ashby)', true),
  ('https://jobs.ashbyhq.com/workos', 'WorkOS (Ashby)', true),
  ('https://jobs.ashbyhq.com/depot', 'Depot (Ashby)', true),
  ('https://jobs.ashbyhq.com/semgrep', 'Semgrep (Ashby)', true),
  ('https://jobs.ashbyhq.com/goteleport', 'Teleport (Ashby)', true),
  ('https://jobs.ashbyhq.com/netbird', 'NetBird (Ashby)', true),
  ('https://jobs.ashbyhq.com/infisical', 'Infisical (Ashby)', true),
  ('https://jobs.ashbyhq.com/Coder', 'Coder (Ashby)', true),
  ('https://jobs.ashbyhq.com/Deepgram', 'Deepgram (Ashby)', true),
  ('https://jobs.ashbyhq.com/runpod', 'RunPod (Ashby)', true),
  ('https://jobs.ashbyhq.com/anyscale', 'Anyscale (Ashby)', true),
  ('https://jobs.ashbyhq.com/fireworks', 'Fireworks AI (Ashby)', true),
  ('https://jobs.ashbyhq.com/revenuecat', 'RevenueCat (Ashby)', true),
  ('https://jobs.ashbyhq.com/stream', 'Stream (Ashby)', true),
  ('https://jobs.ashbyhq.com/sprig', 'Sprig (Ashby)', true),
  ('https://boards.greenhouse.io/fivetran', 'Fivetran / Census (Greenhouse)', true),
  ('https://boards.greenhouse.io/buildkite', 'Buildkite (Greenhouse)', true),
  ('https://boards.greenhouse.io/assemblyai', 'AssemblyAI (Greenhouse)', true),
  ('https://boards.greenhouse.io/gremlin', 'Gremlin (Greenhouse)', true)
on conflict (url) do nothing;

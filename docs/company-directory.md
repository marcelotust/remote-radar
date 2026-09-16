# Company directory (#93)

Curated list of 100 US-based remote-first startups/scale-ups (50–200 employees,
LatAm PJ/EOR hiring history) as candidate scraping targets.

None of the 100 careers URLs from the issue point directly at an ATS (they're
all marketing `/careers` pages on the company's own domain — the same pattern
already known to fail on the generic adapter, see `docs/scraper-sources.md`).
Each was checked for an embedded reference to a known ATS (Ashby / Greenhouse /
Lever) and, where found, the underlying public API was verified directly:

- **28 resolved to a working ATS API** (24 Ashby, 4 Greenhouse) — inserted into
  `scraping_sources` via `supabase/migrations/0013_seed_startup_companies.sql`.
  These fetch a JSON API directly (no page render), so they're cheap and
  reliable — no Playwright timeout risk.
- **72 have no detectable ATS** in their careers page — either a fully custom
  board, or one hosted on an ATS the scraper doesn't support (Workday,
  Rippling, etc.). Left out of `scraping_sources` for now rather than risk
  regressing the generic-adapter success rate (see the "adapter planned"
  section of `docs/scraper-sources.md` for that lesson). Revisit
  case-by-case if a specific one turns out to have a scrapeable board.

This file is the "database" the issue asked for — a reference list, not itself
wired into the scraper. Only the confirmed rows below (Status = "Ativo em
scraping_sources") are actually scraped daily.

## Adding an Ashby company target

Same idea as the Lever/Greenhouse recipe already documented in
`docs/scraper-sources.md`: Ashby is a per-company ATS, one row per target.

1. Find the company's Ashby slug from its public job board URL:
   `https://jobs.ashbyhq.com/<slug>`
2. Confirm the API returns jobs: `https://api.ashbyhq.com/posting-api/job-board/<slug>`
3. Insert one row:

   ```sql
   insert into scraping_sources (url, label, is_active) values
     ('https://jobs.ashbyhq.com/<slug>', '<Company> (Ashby)', true);
   ```

The adapter (`scraper/adapters/ashby.ts`) emits only jobs with
`workplaceType === 'Remote'` — Ashby's `isRemote` flag alone is unreliable (it
stays `true` for hybrid/onsite roles that merely allow occasional remote work).

## Full list

| #   | Empresa           | Setor                                        | Tag           | Careers URL                            | ATS        | Status                        |
| --- | ----------------- | -------------------------------------------- | ------------- | -------------------------------------- | ---------- | ----------------------------- |
| 1   | PostHog           | Product Analytics & DevTools                 | DevTools      | https://posthog.com/careers            | —          | Não wired (sem ATS detectado) |
| 2   | Linear            | Project Management & Issue Tracking          | B2B           | https://linear.app/careers             | —          | Não wired (sem ATS detectado) |
| 3   | Supabase          | Open Source Firebase Alternative             | B2B           | https://supabase.com/careers           | Ashby      | Ativo em scraping_sources     |
| 4   | Neon              | Serverless Postgres Infrastructure           | Database      | https://neon.tech/careers              | —          | Não wired (sem ATS detectado) |
| 5   | Clerk             | Authentication & User Management             | Security      | https://clerk.com/careers              | Ashby      | Ativo em scraping_sources     |
| 6   | Turso             | Edge Database / LibSQL                       | Database      | https://turso.tech/careers             | —          | Não wired (sem ATS detectado) |
| 7   | Render            | Cloud Platform & PaaS                        | Infra         | https://render.com/careers             | Ashby      | Ativo em scraping_sources     |
| 8   | Fly.io            | Distributed Application Platform             | Infra         | https://fly.io/jobs                    | —          | Não wired (sem ATS detectado) |
| 9   | Railway           | Cloud Infrastructure & Deployments           | Infra         | https://railway.com/careers            | —          | Não wired (sem ATS detectado) |
| 10  | Ashby             | All-in-One Recruiting Platform & ATS         | Infra         | https://www.ashbyhq.com/careers        | —          | Não wired (sem ATS detectado) |
| 11  | Hightouch         | Data Activation & Reverse ETL                | B2B           | https://hightouch.com/careers          | —          | Não wired (sem ATS detectado) |
| 12  | Census            | Operational Analytics & Reverse ETL          | B2B           | https://www.getcensus.com/careers      | Greenhouse | Ativo em scraping_sources     |
| 13  | Modern Treasury   | Payment Operations & Banking APIs            | Fintech       | https://www.moderntreasury.com/careers | Ashby      | Ativo em scraping_sources     |
| 14  | Cal.com           | Open Source Scheduling Infrastructure        | Infra         | https://cal.com/careers                | —          | Não wired (sem ATS detectado) |
| 15  | Daily.co          | Real-Time Video & Audio APIs                 | DevTools      | https://www.daily.co/careers           | —          | Não wired (sem ATS detectado) |
| 16  | Tinybird          | Real-Time Data Platform on ClickHouse        | DevTools      | https://www.tinybird.co/careers        | —          | Não wired (sem ATS detectado) |
| 17  | incident.io       | Incident Response & Operations               | DevTools      | https://incident.io/careers            | —          | Não wired (sem ATS detectado) |
| 18  | Liveblocks        | Collaborative Realtime Infrastructure        | Infra         | https://liveblocks.io/careers          | —          | Não wired (sem ATS detectado) |
| 19  | Warp              | AI-Integrated Developer Terminal             | AI            | https://www.warp.dev/careers           | —          | Não wired (sem ATS detectado) |
| 20  | Inngest           | Event-Driven Serverless Workflows            | B2B           | https://www.inngest.com/careers        | Ashby      | Ativo em scraping_sources     |
| 21  | Resend            | Developer-First Email Infrastructure         | AI            | https://resend.com/careers             | —          | Não wired (sem ATS detectado) |
| 22  | LangChain         | LLM Application Framework & Tooling          | AI            | https://www.langchain.com/careers      | Ashby      | Ativo em scraping_sources     |
| 23  | LlamaIndex        | Data Framework for Context-Augmented AI      | AI            | https://www.llamaindex.ai/careers      | —          | Não wired (sem ATS detectado) |
| 24  | Weaviate          | Open Source Vector Database                  | Database      | https://weaviate.io/careers            | —          | Não wired (sem ATS detectado) |
| 25  | Pinecone          | Cloud Vector Database for AI                 | AI            | https://www.pinecone.io/careers        | Ashby      | Ativo em scraping_sources     |
| 26  | Pulumi            | Infrastructure as Code Platform              | Infra         | https://www.pulumi.com/careers         | —          | Não wired (sem ATS detectado) |
| 27  | Prefect           | Workflow Orchestration & Dataflow            | B2B           | https://www.prefect.io/careers         | —          | Não wired (sem ATS detectado) |
| 28  | Dagster Labs      | Data Orchestration Platform                  | Infra         | https://dagster.io/careers             | —          | Não wired (sem ATS detectado) |
| 29  | Cube              | Semantic Layer & Universal Data API          | B2B           | https://cube.dev/careers               | —          | Não wired (sem ATS detectado) |
| 30  | Hasura            | GraphQL & Unified Data Access APIs           | B2B           | https://hasura.io/careers              | —          | Não wired (sem ATS detectado) |
| 31  | Buffer            | Social Media Toolkit & Brand Publishing      | B2B           | https://buffer.com/journey             | —          | Não wired (sem ATS detectado) |
| 32  | Doist             | Productivity Software (Todoist, Twist)       | B2B           | https://doist.com/careers              | —          | Não wired (sem ATS detectado) |
| 33  | Toggl             | Time Tracking & Productivity SaaS            | B2B           | https://toggl.com/jobs                 | —          | Não wired (sem ATS detectado) |
| 34  | 37signals         | Web Software (Basecamp & HEY)                | B2B           | https://37signals.com/jobs             | —          | Não wired (sem ATS detectado) |
| 35  | Ghost             | Open Source Publishing & Subscriptions       | B2B           | https://ghost.org/careers              | —          | Não wired (sem ATS detectado) |
| 36  | Close             | Inside Sales CRM Automation                  | DevTools      | https://close.com/careers              | Ashby      | Ativo em scraping_sources     |
| 37  | Help Scout        | Customer Support & Help Desk SaaS            | B2B           | https://www.helpscout.com/careers      | —          | Não wired (sem ATS detectado) |
| 38  | Aha!              | Product Roadmapping & Strategy Software      | B2B           | https://www.aha.io/company/careers     | —          | Não wired (sem ATS detectado) |
| 39  | DuckDuckGo        | Privacy Search & Browser Software            | B2B           | https://duckduckgo.com/hiring          | —          | Não wired (sem ATS detectado) |
| 40  | Formbricks        | Open Source Survey Infrastructure            | Infra         | https://formbricks.com/careers         | —          | Não wired (sem ATS detectado) |
| 41  | Novu              | Open Source Notification Center              | Messaging     | https://novu.co/careers                | —          | Não wired (sem ATS detectado) |
| 42  | Medusa            | Open Source Headless Commerce                | B2B           | https://medusajs.com/careers           | —          | Não wired (sem ATS detectado) |
| 43  | Chroma            | Open Source AI Embedding Database            | AI            | https://www.trychroma.com/careers      | —          | Não wired (sem ATS detectado) |
| 44  | Braintrust        | Enterprise AI Evaluation & Monitoring        | AI            | https://www.braintrust.com/careers     | —          | Não wired (sem ATS detectado) |
| 45  | Modal Labs        | Cloud Container Platform for AI & HPC        | AI            | https://modal.com/careers              | —          | Não wired (sem ATS detectado) |
| 46  | Replicate         | Machine Learning Model API Platform          | AI            | https://replicate.com/careers          | —          | Não wired (sem ATS detectado) |
| 47  | Vellum            | Enterprise Generative AI Workspace           | AI            | https://www.vellum.ai/careers          | —          | Não wired (sem ATS detectado) |
| 48  | Honeycomb.io      | High-Cardinality Observability               | Observability | https://www.honeycomb.io/careers       | —          | Não wired (sem ATS detectado) |
| 49  | Knock             | Multi-Channel Notifications Infrastructure   | Messaging     | https://knock.app/careers              | Ashby      | Ativo em scraping_sources     |
| 50  | Merge             | Unified APIs for B2B Integrations            | B2B           | https://www.merge.dev/careers          | Ashby      | Ativo em scraping_sources     |
| 51  | Finch             | Unified API for Employment & Payroll Systems | B2B           | https://tryfinch.com/careers           | —          | Não wired (sem ATS detectado) |
| 52  | Stytch            | Passwordless Auth & Identity API             | DevTools      | https://stytch.com/careers             | —          | Não wired (sem ATS detectado) |
| 53  | WorkOS            | Enterprise SSO & Directory Sync APIs         | B2B           | https://workos.com/careers             | Ashby      | Ativo em scraping_sources     |
| 54  | Svix              | Webhooks as a Service Platform               | Infra         | https://www.svix.com/careers           | —          | Não wired (sem ATS detectado) |
| 55  | Oso               | Authorization & Access Control Service       | Security      | https://www.osohq.com/careers          | —          | Não wired (sem ATS detectado) |
| 56  | Plain             | Modern Support Platform for Devs & Tech      | B2B           | https://plain.com/careers              | —          | Não wired (sem ATS detectado) |
| 57  | Loops             | Email Platform for Modern Tech Startups      | AI            | https://loops.so/careers               | —          | Não wired (sem ATS detectado) |
| 58  | Attio             | Flexible, Next-Generation CRM                | B2B           | https://attio.com/careers              | —          | Não wired (sem ATS detectado) |
| 59  | Raycast           | Extensible Desktop Launcher & Tools          | B2B           | https://www.raycast.com/careers        | —          | Não wired (sem ATS detectado) |
| 60  | Superhuman        | High-Performance Email Client                | AI            | https://superhuman.com/careers         | —          | Não wired (sem ATS detectado) |
| 61  | Equals            | Next-Generation Connected Spreadsheet        | B2B           | https://equals.com/careers             | —          | Não wired (sem ATS detectado) |
| 62  | Rows              | Online Spreadsheet with Native Integrations  | B2B           | https://rows.com/careers               | —          | Não wired (sem ATS detectado) |
| 63  | Whimsical         | Collaborative Visual Workspace & Diagrams    | B2B           | https://whimsical.com/careers          | —          | Não wired (sem ATS detectado) |
| 64  | Buildkite         | Hybrid CI/CD Pipeline Infrastructure         | Infra         | https://buildkite.com/careers          | Greenhouse | Ativo em scraping_sources     |
| 65  | Earthly           | Repeatable Build Automation Platform         | Infra         | https://earthly.dev/careers            | —          | Não wired (sem ATS detectado) |
| 66  | Depot             | Fast Remote Docker Container Builds          | AI            | https://depot.dev/careers              | Ashby      | Ativo em scraping_sources     |
| 67  | Deno              | Modern Runtime for TypeScript/JavaScript     | B2B           | https://deno.com/jobs                  | —          | Não wired (sem ATS detectado) |
| 68  | Socket            | Supply Chain Security for Open Source        | AI            | https://socket.dev/careers             | —          | Não wired (sem ATS detectado) |
| 69  | Chainguard        | Secure Software Supply Chain Solutions       | AI            | https://www.chainguard.dev/careers     | —          | Não wired (sem ATS detectado) |
| 70  | Semgrep           | Fast Code Analysis & AppSec Tooling          | B2B           | https://semgrep.dev/careers            | Ashby      | Ativo em scraping_sources     |
| 71  | Teleport          | Identity-Based Infrastructure Access         | DevTools      | https://goteleport.com/careers         | Ashby      | Ativo em scraping_sources     |
| 72  | Twingate          | Zero Trust Network Access (ZTNA)             | Security      | https://www.twingate.com/careers       | —          | Não wired (sem ATS detectado) |
| 73  | NetBird           | Zero Trust Overlay Mesh Networking           | Security      | https://netbird.io/careers             | Ashby      | Ativo em scraping_sources     |
| 74  | Doppler           | Universal Secrets Management Platform        | Security      | https://www.doppler.com/careers        | —          | Não wired (sem ATS detectado) |
| 75  | Infisical         | Open Source Secrets Management               | Security      | https://infisical.com/careers          | Ashby      | Ativo em scraping_sources     |
| 76  | Gitpod            | Cloud Development Environments (CDEs)        | Infra         | https://www.gitpod.io/careers          | —          | Não wired (sem ATS detectado) |
| 77  | Coder             | Self-Hosted Cloud Development Platform       | Infra         | https://coder.com/careers              | Ashby      | Ativo em scraping_sources     |
| 78  | Daytona           | Open Source Development Environment Mgmt     | B2B           | https://daytona.io/careers             | —          | Não wired (sem ATS detectado) |
| 79  | Hex               | Collaborative Data Science & Analytics       | B2B           | https://hex.tech/careers               | —          | Não wired (sem ATS detectado) |
| 80  | Deepgram          | Automatic Speech Recognition & Voice AI      | AI            | https://deepgram.com/careers           | Ashby      | Ativo em scraping_sources     |
| 81  | AssemblyAI        | Speech-to-Text & Audio Intelligence APIs     | Media         | https://www.assemblyai.com/careers     | Greenhouse | Ativo em scraping_sources     |
| 82  | RunPod            | Distributed Cloud Computing for AI/ML        | AI            | https://www.runpod.io/careers          | Ashby      | Ativo em scraping_sources     |
| 83  | Anyscale          | Managed Ray Platform for AI Scalability      | AI            | https://anyscale.com/careers           | Ashby      | Ativo em scraping_sources     |
| 84  | Fireworks AI      | Low-Latency Generative AI Inference          | AI            | https://fireworks.ai/careers           | Ashby      | Ativo em scraping_sources     |
| 85  | Together AI       | Cloud Infrastructure & Training for AI       | AI            | https://www.together.ai/careers        | —          | Não wired (sem ATS detectado) |
| 86  | Temporal          | Durable Execution Workflow Platform          | Infra         | https://temporal.io/careers            | —          | Não wired (sem ATS detectado) |
| 87  | Courier           | Notification Orchestration Platform          | Messaging     | https://www.courier.com/careers        | —          | Não wired (sem ATS detectado) |
| 88  | Customer.io       | Automated Messaging & Customer Journeys      | B2B           | https://customer.io/careers            | —          | Não wired (sem ATS detectado) |
| 89  | OneSignal         | Omnichannel Engagement & Push Messaging      | Messaging     | https://onesignal.com/careers          | —          | Não wired (sem ATS detectado) |
| 90  | RevenueCat        | Mobile In-App Subscription Infrastructure    | Infra         | https://revenuecat.com/careers         | Ashby      | Ativo em scraping_sources     |
| 91  | Stream            | In-App Messaging & Activity Feed APIs        | Messaging     | https://getstream.io/careers           | Ashby      | Ativo em scraping_sources     |
| 92  | Vitally           | B2B Customer Success Platform                | B2B           | https://vitally.com/careers            | —          | Não wired (sem ATS detectado) |
| 93  | Catalyst Software | Customer Revenue Optimization Platform       | B2B           | https://catalyst.io/careers            | —          | Não wired (sem ATS detectado) |
| 94  | Planhat           | Customer Operations & Retention Software     | B2B           | https://www.planhat.com/careers        | —          | Não wired (sem ATS detectado) |
| 95  | Maze              | Continuous User Discovery & Testing Platform | Infra         | https://maze.co/careers                | —          | Não wired (sem ATS detectado) |
| 96  | Sprig             | In-Product Experience Analysis & Insights    | B2B           | https://sprig.com/careers              | Ashby      | Ativo em scraping_sources     |
| 97  | Better Stack      | Uptime Monitoring & Incident Logs            | DevTools      | https://betterstack.com/careers        | —          | Não wired (sem ATS detectado) |
| 98  | Axiom             | Cloud Log Analytics & Observability          | Observability | https://axiom.co/careers               | —          | Não wired (sem ATS detectado) |
| 99  | Gremlin           | Chaos Engineering & Resilience Testing       | B2B           | https://gremlin.com/careers            | Greenhouse | Ativo em scraping_sources     |
| 100 | Mux               | Programmable Video Streaming Infrastructure  | DevTools      | https://mux.com/careers                | —          | Não wired (sem ATS detectado) |

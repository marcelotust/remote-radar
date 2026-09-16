# React/Next.js/TypeScript ecosystem directory (#94)

Secondary list of 80 companies (50–200 employees) building heavily on
React/Next.js/TypeScript, from issue #94. Same approach as
`docs/company-directory.md` (#93): none of the 80 careers URLs point directly
at an ATS, so each was checked for an embedded reference to Ashby/Greenhouse/
Lever and verified against the underlying public API before being wired in.

- **19 resolved to a working ATS API** (12 Ashby, 7 Greenhouse) — inserted
  into `scraping_sources` via `supabase/migrations/0014_seed_react_ecosystem_companies.sql`.
- **61 have no detectable ATS** — left out for the same reliability reasons
  documented in `docs/scraper-sources.md` and `docs/company-directory.md`.

A handful of the 61 (Payload CMS, Eraser, Slite, Height, Play.ht, Whereby,
LogRocket, Grafana Labs, and a few others) also returned a 4xx/0 status on a
plain HTTP fetch of their careers URL during this check — that doesn't
necessarily mean the link is dead (client-side routed SPAs and anti-bot
checks commonly reject a non-browser request), just that it couldn't be
auto-verified; worth a manual look if adding one of these later.

## Finding jobs at the rest manually

For the 61 not wired into the scraper, see the new README section "Finding
jobs beyond the scraper" for Google Dorks + Ashby/Wellfound search tips.

## Full list

| #   | Empresa         | Foco do Produto                             | Careers URL                                  | ATS        | Status                        |
| --- | --------------- | ------------------------------------------- | -------------------------------------------- | ---------- | ----------------------------- |
| 101 | Prisma          | Node.js & TypeScript ORM                    | https://www.prisma.io/careers                | —          | Não wired (sem ATS detectado) |
| 102 | Vercel          | Frontend Cloud & Next.js Ecosystem          | https://vercel.com/careers                   | Greenhouse | Ativo em scraping_sources     |
| 103 | Railway         | Developer Infrastructure Platform           | https://railway.com/careers                  | —          | Não wired (sem ATS detectado) |
| 104 | Biome           | Fast Formatter & Linter for Web Tools       | https://biomejs.dev/                         | —          | Não wired (sem ATS detectado) |
| 105 | Sentry          | Application Performance Monitoring & Errors | https://sentry.io/careers/                   | Ashby      | Ativo em scraping_sources     |
| 106 | Sourcegraph     | Code Intelligence & Search Engine           | https://sourcegraph.com/jobs                 | Greenhouse | Ativo em scraping_sources     |
| 107 | Retool          | Low-Code Internal Tools Builder             | https://retool.com/careers                   | —          | Não wired (sem ATS detectado) |
| 108 | Appsmith        | Open Source Internal Tools Framework        | https://www.appsmith.com/careers             | —          | Não wired (sem ATS detectado) |
| 109 | Budibase        | Low-Code App Platform for Businesses        | https://budibase.com/careers                 | —          | Não wired (sem ATS detectado) |
| 110 | ToolJet         | Open-Source Low-Code Platform               | https://www.tooljet.com/careers              | —          | Não wired (sem ATS detectado) |
| 111 | Strapi          | Headless CMS Platform in Node/React         | https://strapi.io/careers                    | —          | Não wired (sem ATS detectado) |
| 112 | Sanity.io       | Composable Content Cloud                    | https://www.sanity.io/careers                | —          | Não wired (sem ATS detectado) |
| 113 | Directus        | Real-time Data Platform & Headless CMS      | https://directus.io/careers                  | —          | Não wired (sem ATS detectado) |
| 114 | Payload CMS     | Next.js & TypeScript Native Headless CMS    | https://payloadcms.com/community/careers     | —          | Não wired (sem ATS detectado) |
| 115 | Storyblok       | Headless Content Management System          | https://www.storyblok.com/jobs               | —          | Não wired (sem ATS detectado) |
| 116 | Contentful      | API-First Composable Content Platform       | https://www.contentful.com/careers/          | —          | Não wired (sem ATS detectado) |
| 117 | LaunchDarkly    | Feature Flagging & Experimentation          | https://launchdarkly.com/careers/            | Greenhouse | Ativo em scraping_sources     |
| 118 | Statsig         | Feature Flags & Modern Experimentation      | https://statsig.com/careers                  | —          | Não wired (sem ATS detectado) |
| 119 | GrowthBook      | Open Source Feature Flags & A/B Testing     | https://www.growthbook.io/careers            | —          | Não wired (sem ATS detectado) |
| 120 | Postman         | API Development & Testing Platform          | https://www.postman.com/company/careers/     | —          | Não wired (sem ATS detectado) |
| 121 | Speakeasy       | SDK Generation & Developer Experience       | https://www.speakeasy.com/careers            | Ashby      | Ativo em scraping_sources     |
| 122 | Fern            | API Tooling for SDKs & Docs Generation      | https://buildwithfern.com/careers            | —          | Não wired (sem ATS detectado) |
| 123 | Mintlify        | Automated Modern Developer Documentation    | https://mintlify.com/careers                 | —          | Não wired (sem ATS detectado) |
| 124 | GitBook         | Knowledge Base & Documentation Tools        | https://www.gitbook.com/careers              | Ashby      | Ativo em scraping_sources     |
| 125 | ReadMe          | Interactive API Documentation               | https://readme.com/careers                   | Ashby      | Ativo em scraping_sources     |
| 126 | Tailwind Labs   | UI Components & Tailwind CSS Tooling        | https://tailwindcss.com/                     | —          | Não wired (sem ATS detectado) |
| 127 | shadcn/ui       | Open Source UI Component Architecture       | https://ui.shadcn.com/                       | —          | Não wired (sem ATS detectado) |
| 128 | Fontshare / ITF | Typography and Web Font Technology          | https://www.fontshare.com/                   | —          | Não wired (sem ATS detectado) |
| 129 | Framer          | Interactive Web & Layout Design Platform    | https://www.framer.com/careers/              | —          | Não wired (sem ATS detectado) |
| 130 | Penpot          | Open Source Design & Prototyping            | https://penpot.app/careers                   | —          | Não wired (sem ATS detectado) |
| 131 | Excalidraw      | Collaborative Virtual Whiteboard System     | https://plus.excalidraw.com/                 | —          | Não wired (sem ATS detectado) |
| 132 | tldraw          | Collaborative Canvas & Digital Ink Engine   | https://tldraw.dev/                          | —          | Não wired (sem ATS detectado) |
| 133 | Eraser          | Technical Documentation & Diagram Tooling   | https://www.eraser.io/careers                | —          | Não wired (sem ATS detectado) |
| 134 | Capacities      | Networked Note-Taking & Knowledge App       | https://capacities.io/                       | —          | Não wired (sem ATS detectado) |
| 135 | Reflect         | Networked Note-Taking with AI Assistant     | https://reflect.app/                         | —          | Não wired (sem ATS detectado) |
| 136 | Craft.do        | Document Editor and Knowledge Base          | https://www.craft.do/careers                 | —          | Não wired (sem ATS detectado) |
| 137 | Slite           | AI-Driven Team Documentation & Wiki         | https://slite.com/careers                    | —          | Não wired (sem ATS detectado) |
| 138 | Nuclino         | Unified Collective Brain & Knowledge Hub    | https://www.nuclino.com/jobs                 | —          | Não wired (sem ATS detectado) |
| 139 | Taskade         | AI Project Workflows & Collaborative Tasks  | https://www.taskade.com/jobs                 | —          | Não wired (sem ATS detectado) |
| 140 | Height          | Autonomous AI-Driven Project Tracking       | https://height.app/careers                   | —          | Não wired (sem ATS detectado) |
| 141 | Shortcut        | Project Management for Software Teams       | https://www.shortcut.com/careers             | —          | Não wired (sem ATS detectado) |
| 142 | Plane           | Open Source Project Tracking Alternative    | https://plane.so/careers                     | —          | Não wired (sem ATS detectado) |
| 143 | Coda            | Interactive Doc Platform with Automations   | https://coda.io/careers                      | —          | Não wired (sem ATS detectado) |
| 144 | Airtable        | Low-Code Relational Database Platform       | https://airtable.com/careers                 | —          | Não wired (sem ATS detectado) |
| 145 | Clay            | Data Enrichment & Outbound Sales Engine     | https://www.clay.com/careers                 | —          | Não wired (sem ATS detectado) |
| 146 | Apollo.io       | B2B Lead Intelligence & Sales Engagement    | https://www.apollo.io/careers                | —          | Não wired (sem ATS detectado) |
| 147 | Wandb (W&B)     | ML Experiment Tracking & Observability      | https://wandb.ai/site/careers                | —          | Não wired (sem ATS detectado) |
| 148 | Comet ML        | MLOps Platform for ML Model Management      | https://www.comet.com/site/about-us/careers/ | —          | Não wired (sem ATS detectado) |
| 149 | Roboflow        | Computer Vision Infrastructure & Annotation | https://roboflow.com/careers                 | Ashby      | Ativo em scraping_sources     |
| 150 | Scale AI        | Data Engine for Artificial Intelligence     | https://scale.com/careers                    | —          | Não wired (sem ATS detectado) |
| 151 | Vapi            | Voice AI Platform for Developers            | https://vapi.ai/careers                      | Ashby      | Ativo em scraping_sources     |
| 152 | Bland AI        | Autonomous Phone Agents API Infrastructure  | https://www.bland.ai/careers                 | Ashby      | Ativo em scraping_sources     |
| 153 | Cartesia        | Ultra-Fast Real-Time Voice Synthesis        | https://cartesia.ai/careers                  | Ashby      | Ativo em scraping_sources     |
| 154 | Play.ht         | AI Voice Generator & Conversational APIs    | https://play.ht/careers/                     | —          | Não wired (sem ATS detectado) |
| 155 | ElevenLabs      | AI Audio & Speech Synthesis Research        | https://elevenlabs.io/careers                | —          | Não wired (sem ATS detectado) |
| 156 | Photoroom       | AI Photo Editor & Product Imaging           | https://www.photoroom.com/careers            | Ashby      | Ativo em scraping_sources     |
| 157 | Cutout Pro      | Visual AI Automation Platform               | https://www.cutout.pro/                      | —          | Não wired (sem ATS detectado) |
| 158 | Descript        | Audio/Video Editing via Text Transcript     | https://www.descript.com/careers             | Greenhouse | Ativo em scraping_sources     |
| 159 | Kapwing         | Online Collaborative Video Editor           | https://www.kapwing.com/careers              | —          | Não wired (sem ATS detectado) |
| 160 | Riverside.fm    | High-Quality Studio Recording Online        | https://riverside.fm/careers                 | —          | Não wired (sem ATS detectado) |
| 161 | LiveKit         | Real-Time Video, Audio, and WebRTC Infra    | https://livekit.io/careers                   | Ashby      | Ativo em scraping_sources     |
| 162 | Whereby         | Embedded Video Conferencing APIs            | https://whereby.com/information/jobs/        | —          | Não wired (sem ATS detectado) |
| 163 | Agora.io        | Real-Time Engagement Engine (RTC/RTM)       | https://www.agora.io/en/careers/             | —          | Não wired (sem ATS detectado) |
| 164 | Twilio Segment  | Customer Data Platform (CDP)                | https://segment.com/careers/                 | —          | Não wired (sem ATS detectado) |
| 165 | RudderStack     | Customer Data Pipeline for Developers       | https://www.rudderstack.com/careers/         | —          | Não wired (sem ATS detectado) |
| 166 | Mixpanel        | Product Analytics for Mobile & Web          | https://mixpanel.com/jobs/                   | Greenhouse | Ativo em scraping_sources     |
| 167 | Amplitude       | Digital Analytics & Optimization Platform   | https://amplitude.com/careers                | Greenhouse | Ativo em scraping_sources     |
| 168 | Heap            | Automated Digital Behavioral Analytics      | https://www.heap.io/careers                  | —          | Não wired (sem ATS detectado) |
| 169 | FullStory       | Behavioral Data & Session Insights          | https://www.fullstory.com/careers/           | —          | Não wired (sem ATS detectado) |
| 170 | LogRocket       | Frontend Monitoring & Session Replay        | https://logrocket.com/jobs/                  | —          | Não wired (sem ATS detectado) |
| 171 | Highlight.io    | Full-Stack Open Source Monitoring Tool      | https://www.highlight.io/careers             | —          | Não wired (sem ATS detectado) |
| 172 | Metabase        | Open Source Business Intelligence           | https://www.metabase.com/jobs                | —          | Não wired (sem ATS detectado) |
| 173 | Lightdash       | Open Source BI Native to dbt                | https://www.lightdash.com/careers            | Ashby      | Ativo em scraping_sources     |
| 174 | Evidence        | Code-Based BI & Reports in Markdown         | https://evidence.dev/careers                 | —          | Não wired (sem ATS detectado) |
| 175 | Grafana Labs    | Open Observability & Dashboard Platform     | https://grafana.com/about/careers/           | —          | Não wired (sem ATS detectado) |
| 176 | Chronosphere    | Cloud-Native Observability Platform         | https://chronosphere.io/careers/             | —          | Não wired (sem ATS detectado) |
| 177 | Coralogix       | In-Stream Observability & Log Analytics     | https://coralogix.com/careers/               | —          | Não wired (sem ATS detectado) |
| 178 | Kong            | Cloud-Native API Gateway & Service Mesh     | https://konghq.com/careers                   | Ashby      | Ativo em scraping_sources     |
| 179 | Solo.io         | Application Networking & Service Mesh       | https://www.solo.io/company/careers/         | Greenhouse | Ativo em scraping_sources     |
| 180 | Buoyant         | Service Mesh Infrastructure (Linkerd)       | https://buoyant.io/careers                   | —          | Não wired (sem ATS detectado) |

# Remote Radar

A personal dashboard for tracking and prioritizing remote job opportunities. Built for Brazilian developers targeting international remote roles.

## What it does

- **Job feed** — displays scraped job listings with relevance scores based on keyword matching
- **Smart scoring** — positive keywords (React, TypeScript, remote...) and negative ones (Java, presencial, PHP...) produce a score that sorts the feed automatically
- **Wishlist companies** — track companies you're interested in, including whether they hire remotely from Brazil
- **Networking dork** — one-click Google search targeting LinkedIn profiles at any company
- **Status tracking** — mark jobs as unseen / seen / applied / dismissed
- **Scraping sources** — manage the list of job board URLs for the external scraper

## Stack

| Concern      | Choice                               |
| ------------ | ------------------------------------ |
| Framework    | React 18 + TypeScript (strict)       |
| Build        | Vite                                 |
| Styling      | Tailwind CSS v4 (dark mode)          |
| Routing      | React Router DOM v6                  |
| Server state | TanStack Query v5                    |
| UI state     | React Context                        |
| Backend      | Supabase (PostgREST) — not wired yet |
| Testing      | Vitest + React Testing Library       |
| Linting      | ESLint flat config + Prettier        |

## Getting started

```bash
npm install
npm run dev
```

## Commands

```bash
npm run dev        # dev server with HMR
npm run build      # type-check + production build
npm run test       # Vitest in watch mode
npm run test:run   # single test run
npm run coverage   # tests with coverage report (80% threshold)
npm run lint       # ESLint
npm run format     # Prettier
```

Run a single test file:

```bash
npx vitest run src/hooks/useJobs.spec.tsx
```

## Project structure

```
src/
├── components/      # UI components (co-located with .spec.tsx)
├── pages/           # DashboardPage, WishlistPage
├── hooks/           # TanStack Query hooks (useJobs, useCompanies, useSources, ...)
├── contexts/        # UIContext (filters, modal state, editing state)
├── utils/           # scoring.ts, dorkUrl.ts, keywords.ts
├── data/            # mockData.ts (temporary — replaced by Supabase in next phase)
└── types/           # Shared TypeScript types
```

## Current state

The app runs entirely on mock data (`src/data/mockData.ts`). All mutations write to TanStack Query's in-memory cache — nothing persists on refresh. The next phase is connecting to a real Supabase backend.

Open issues tracking what's next: [github.com/marcelotust/remote-radar/issues](https://github.com/marcelotust/remote-radar/issues)

## Finding jobs beyond the scraper

Only companies with a public Lever/Greenhouse/Ashby job board (see
`scraper/adapters/`) get scraped automatically — most companies' careers
pages are custom marketing pages the scraper can't parse reliably (see
`docs/scraper-sources.md`, `docs/company-directory.md`,
`docs/react-ecosystem-directory.md`). For everything else, search manually:

- **Google Dorks** — narrow a search engine to a specific ATS or company
  domain, e.g.:
  - `site:jobs.ashbyhq.com "remote" (react OR typescript)`
  - `site:boards.greenhouse.io "remote" frontend`
  - `site:jobs.lever.co "remote" engineer`
  - `"<company>" careers remote site:linkedin.com/jobs` for a specific target
- **Ashby** ([jobs.ashbyhq.com](https://jobs.ashbyhq.com)) and **Wellfound**
  ([wellfound.com](https://wellfound.com)) both let you filter by remote +
  keyword directly on the portal, without needing a company's own careers
  page at all — useful for the "not wired" rows in the directory docs above.

## Routes

| Path        | Page                                      |
| ----------- | ----------------------------------------- |
| `/`         | Dashboard — job feed with filters         |
| `/wishlist` | Wishlist — companies and scraping sources |

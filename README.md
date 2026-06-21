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

## Routes

| Path        | Page                                      |
| ----------- | ----------------------------------------- |
| `/`         | Dashboard — job feed with filters         |
| `/wishlist` | Wishlist — companies and scraping sources |

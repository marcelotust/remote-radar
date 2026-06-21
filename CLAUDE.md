# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start dev server
npm run build        # type-check + build
npm run test         # vitest in watch mode
npm run test:run     # vitest single run
npm run coverage     # run tests with coverage (80% line/function threshold)
npm run lint         # ESLint
npm run format       # Prettier
```

Run a single test file:

```bash
npx vitest run src/hooks/useJobs.spec.tsx
```

## Architecture

Remote Radar is a job-tracking SPA for Brazilian remote developers. It is currently in a **mock data phase** — no backend exists yet. All data operations are in-memory via TanStack Query's cache.

### Provider stack (`App.tsx`)

```
QueryClientProvider → UIProvider → BrowserRouter
```

- `QueryClientProvider`: wraps everything; React Query is used as the state layer even for mock data.
- `UIProvider` (`src/contexts/UIContext.tsx`): global UI state — filter state (`FilterState`), modal open/close flags, and which entity is being edited (`editingCompany`, `editingSource`).

### Routes

| Path        | Page                                                   |
| ----------- | ------------------------------------------------------ |
| `/`         | `DashboardPage` — filtered job list                    |
| `/wishlist` | `WishlistPage` — wishlist companies + scraping sources |

### Data flow

All data originates from `src/data/mockData.ts`. Hooks fetch from there via `useQuery` with `structuredClone` so mutations operate on independent copies:

- `useJobs` → enriches raw jobs with `relevance_score`/`relevance_level` (via `computeRelevanceScore`) and `is_wishlist_company`/`wishlist_remote_brazil` (by joining against `useCompanies` results via a memoised `wishlistMap`).
- `useCompanies`, `useSources` → thin wrappers around `useQuery`.
- Mutation hooks (`useCompanyMutations`, `useSourceMutations`, `useUpdateJobStatus`) write back directly to the query cache via `qc.setQueryData`. `useUpdateJobStatus` implements optimistic updates with rollback on error.

### Scoring & keywords

`src/utils/scoring.ts` — `computeRelevanceScore` scans job title + description for positive/negative keywords defined in `src/utils/keywords.ts`. Score = positive matches − negative matches; thresholds map to `RelevanceLevel` (`high ≥ 3`, `medium ≥ 1`, `low = 0`, `negative < 0`).

### Networking dork

`src/utils/dorkUrl.ts` builds a Google search URL targeting LinkedIn profiles at a given company in Brazil. Used by `NetworkingButton` via `useNetworkingDork`.

### Key types (`src/types/index.ts`)

- `Job` — core entity; `status` (`unseen | seen | applied | dismissed`), optional enriched fields set by `useJobs`.
- `Company` — wishlist entry with `remote_brazil: 'unknown' | 'yes' | 'no'`.
- `ScrapingSource` — URL + label for future scraper targets.
- `FilterState` — `{ status, relevance, wishlistOnly }` held in `UIContext`.

### Testing conventions

Tests use Vitest + React Testing Library + `@testing-library/jest-dom`. Components that depend on React Query must be wrapped in a `QueryClientProvider` with a fresh client per test. `UIProvider` is added where `useUIContext` is needed. Files follow the co-location pattern: `Component/Component.spec.tsx` next to `Component/Component.tsx`.
